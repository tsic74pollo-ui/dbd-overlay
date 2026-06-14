import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { pushSnapshot } from "./backup";

/**
 * エディタを開いている間、ルーム情報を自動でスナップショット保存する。
 * - ルームの追加/削除/複製/名前変更が起きた瞬間に即座に保存
 * - 設定値の変更は 30 秒デバウンスで保存
 * - 直近最大 10 件まで localStorage に保持される（lib/backup.ts）
 */
export function useAutoBackup() {
  useEffect(() => {
    // 起動時の現状も1スナップ取っておく（初回保護）
    const init = useAppStore.getState();
    pushSnapshot(init.rooms, init.activeRoomId);

    let timer: number | null = null;
    let lastRoomIds = init.rooms.map((r) => r.id).join(",");

    const unsub = useAppStore.subscribe((state) => {
      const ids = state.rooms.map((r) => r.id).join(",");
      const structuralChange = ids !== lastRoomIds;
      lastRoomIds = ids;

      if (structuralChange) {
        // ルーム追加/削除/名前変更は即時保存
        pushSnapshot(state.rooms, state.activeRoomId);
        return;
      }
      // 設定変更は 30 秒に1回まとめて保存
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        const s = useAppStore.getState();
        pushSnapshot(s.rooms, s.activeRoomId);
      }, 30_000);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);
}
