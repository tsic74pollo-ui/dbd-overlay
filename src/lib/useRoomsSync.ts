import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { useConnectionStore, type ConnectionStatus } from "@/store/connectionStore";
import { joinRoom } from "@/lib/realtimeSync";
import { isSupabaseConfigured } from "@/lib/supabase";

type Handle = ReturnType<typeof joinRoom>;

/**
 * エディタを開いている間、全ルームのチャンネルに editor として同時接続し続ける。
 * 設定変更をそのルームへ配信する。
 *
 * Tier 1 egress reduction (overlay-fx 同等):
 *  #1 debounce 200ms → 1500ms (連続スライダー操作の中間値を捨てる)
 *  #2 同一ハッシュは送らない(クラスタが同じ最終状態に落ち着いた時)
 *  #3 document.hidden 中は配信スキップ(visibilitychange で復帰時に一括配信)
 *  #5 viewer 不在(presence) のルームは配信スキップ
 *  #4 ペイロード圧縮は realtimeSync.ts 内の compressSettings で実施
 *
 * 統計は window.__dbdOverlayEgressStats で参照可能(デバッグ用)。
 */
type EgressStats = {
  skipIdentical: number;
  skipHidden: number;
  skipNoViewer: number;
  sent: number;
};

const PUBLISH_DEBOUNCE_MS = 1500;

export function useRoomsSync() {
  const setStatus = useConnectionStore((s) => s.setStatus);
  const setRoomSettings = useAppStore((s) => s.setRoomSettings);
  const roomIdsKey = useAppStore((s) => s.rooms.map((r) => r.id).join(","));

  const handles = useRef<Map<string, Handle>>(new Map());
  const statuses = useRef<Map<string, ConnectionStatus>>(new Map());
  const pending = useRef<Set<string>>(new Set());
  const debounce = useRef<number | null>(null);
  const lastHash = useRef<Map<string, string>>(new Map());
  const viewerCounts = useRef<Map<string, number>>(new Map());
  const stats = useRef<EgressStats>({
    skipIdentical: 0,
    skipHidden: 0,
    skipNoViewer: 0,
    sent: 0,
  });

  const exposeStats = () => {
    (window as unknown as { __dbdOverlayEgressStats?: EgressStats })
      .__dbdOverlayEgressStats = stats.current;
  };

  const reportStatus = () => {
    const vals = [...statuses.current.values()];
    if (vals.length === 0) return setStatus("idle");
    if (vals.includes("live")) return setStatus("live");
    if (vals.includes("connecting")) return setStatus("connecting");
    if (vals.includes("error")) return setStatus("error");
    return setStatus("offline");
  };

  const currentSettings = (id: string) =>
    useAppStore.getState().rooms.find((r) => r.id === id)?.settings ?? null;

  // ルームの追加/削除に合わせて handle を開閉
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("error", "Supabase 未設定 (.env.local を設定してください)");
      return;
    }
    const ids = useAppStore.getState().rooms.map((r) => r.id);

    for (const id of ids) {
      if (handles.current.has(id)) continue;
      const h = joinRoom(id, "editor", {
        onState: (settings) => setRoomSettings(id, settings),
        onStateRequest: () => currentSettings(id),
        onStatus: (st) => {
          statuses.current.set(id, st);
          if (st === "live") {
            // 接続確立時は viewer 数チェックを通さず1回だけ先出し
            const s = currentSettings(id);
            if (s) {
              handles.current.get(id)?.publish(s);
              lastHash.current.set(id, JSON.stringify(s));
              stats.current.sent++;
              exposeStats();
            }
          }
          reportStatus();
        },
        onViewerCount: (count) => {
          const prev = viewerCounts.current.get(id) ?? 0;
          viewerCounts.current.set(id, count);
          // 新しい viewer が join した瞬間は即時送る(無反応に見えるのを防ぐ)
          if (prev === 0 && count > 0) {
            const s = currentSettings(id);
            if (s) {
              handles.current.get(id)?.publish(s);
              lastHash.current.set(id, JSON.stringify(s));
              stats.current.sent++;
              exposeStats();
            }
          }
        },
      });
      if (h) handles.current.set(id, h);
    }
    for (const id of [...handles.current.keys()]) {
      if (ids.includes(id)) continue;
      handles.current.get(id)?.unsubscribe();
      handles.current.delete(id);
      statuses.current.delete(id);
      pending.current.delete(id);
      lastHash.current.delete(id);
      viewerCounts.current.delete(id);
    }
    reportStatus();
  }, [roomIdsKey, setRoomSettings, setStatus]);

  // settings 変化をデバウンス + Tier1 ゲートで配信
  useEffect(() => {
    const flush = () => {
      // #3 document.hidden 中はまるごとスキップ(復帰時に一括送信する)
      if (typeof document !== "undefined" && document.hidden) {
        stats.current.skipHidden += pending.current.size;
        pending.current.clear();
        exposeStats();
        return;
      }
      for (const id of pending.current) {
        const handle = handles.current.get(id);
        if (!handle) continue;

        // #5 viewer 不在ならスキップ(誰も聞いていないので配信無意味)
        if (!handle.hasViewers()) {
          stats.current.skipNoViewer++;
          continue;
        }

        const s = currentSettings(id);
        if (!s) continue;

        // #2 同一ハッシュ → スキップ
        const hash = JSON.stringify(s);
        if (lastHash.current.get(id) === hash) {
          stats.current.skipIdentical++;
          continue;
        }
        lastHash.current.set(id, hash);
        handle.publish(s);
        stats.current.sent++;
      }
      pending.current.clear();
      exposeStats();
    };

    const unsub = useAppStore.subscribe((state, prev) => {
      for (const r of state.rooms) {
        const prevR = prev.rooms.find((p) => p.id === r.id);
        if (prevR && prevR.settings === r.settings) continue;
        pending.current.add(r.id);
      }
      if (pending.current.size === 0) return;
      if (debounce.current) clearTimeout(debounce.current);
      // #1 debounce 1500ms (旧 200ms)
      debounce.current = window.setTimeout(flush, PUBLISH_DEBOUNCE_MS);
    });

    // タブ復帰時に全ルームの最新値を1回だけ配信(hidden 中に溜まった変化を反映)
    const onVisibility = () => {
      if (document.hidden) return;
      const ids = useAppStore.getState().rooms.map((r) => r.id);
      for (const id of ids) {
        const handle = handles.current.get(id);
        if (!handle || !handle.hasViewers()) continue;
        const s = currentSettings(id);
        if (!s) continue;
        const hash = JSON.stringify(s);
        if (lastHash.current.get(id) === hash) continue;
        lastHash.current.set(id, hash);
        handle.publish(s);
        stats.current.sent++;
      }
      exposeStats();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // unmount で全クリーンアップ
  useEffect(() => {
    const map = handles.current;
    const sts = statuses.current;
    const pend = pending.current;
    const hashes = lastHash.current;
    const viewers = viewerCounts.current;
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      for (const h of map.values()) h?.unsubscribe();
      map.clear();
      sts.clear();
      pend.clear();
      hashes.clear();
      viewers.clear();
      setStatus("idle");
    };
  }, [setStatus]);
}
