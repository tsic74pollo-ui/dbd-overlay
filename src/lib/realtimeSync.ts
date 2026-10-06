// Overlay settings sync — Ably transport (migrated off Supabase 2026-06-29).
// Public API unchanged. Invariants: fail-static, Ably auto-reconnect,
// default-strip compression, viewer-count gate.
import type { RealtimeChannel } from "ably";
import type { OverlaySettings } from "./types";
import { getAbly } from "./ably";
import { compressSettings, decompressSettings } from "./settingsCompress";

export type SyncEvents = {
  onState: (settings: OverlaySettings) => void;
  onStateRequest?: () => OverlaySettings | null;
  onStatus?: (status: "connecting" | "live" | "offline" | "error", err?: string) => void;
  onViewerCount?: (count: number) => void;
  /** state publish の成否。Ably はメッセージ 64KiB 上限超過(40009)等で publish を
   *  拒否するが、従来は unhandled rejection で UI からは「Live なのに届かない」
   *  silent failure になっていた(2026-07-17 OBS無表示事件)。必ず結果を返す。 */
  onPublishResult?: (ok: boolean, errMsg?: string) => void;
};

type Handle = {
  unsubscribe: () => void;
  publish: (settings: OverlaySettings) => void;
  requestState: () => void;
  hasViewers: () => boolean;
};

const channelName = (roomId: string) => `dbd:state:${roomId}`;

export function joinRoom(
  roomId: string,
  role: "editor" | "viewer",
  events: SyncEvents,
): Handle | null {
  const client = getAbly();

  let stopped = false;
  let viewerCount = 0;
  const channel: RealtimeChannel = client.channels.get(channelName(roomId));

  events.onStatus?.("connecting");

  // Ably の1メッセージ上限は 65,536 bytes(実測)。超過分は 40009 で拒否される。
  // 事前検査でわずかに余裕を持たせ、失敗が確定している publish は送らない。
  const PUBLISH_MAX_BYTES = 65_000;

  const publishState = (settings: OverlaySettings) => {
    const payload = { settings: compressSettings(settings) };
    const bytes = JSON.stringify(payload).length;
    if (bytes > PUBLISH_MAX_BYTES) {
      events.onPublishResult?.(
        false,
        `設定 ${Math.round(bytes / 1024)}KB が配信上限 64KB を超過(画像が大きすぎます)`,
      );
      return;
    }
    channel.publish("state", payload).then(
      () => events.onPublishResult?.(true),
      (err: unknown) => {
        const e = err as { code?: number; message?: string };
        events.onPublishResult?.(
          false,
          e?.code === 40009
            ? "設定が配信上限 64KB を超過(画像が大きすぎます)"
            : `配信エラー: ${e?.message ?? "unknown"}`,
        );
      },
    );
  };

  const refreshViewers = () => {
    if (role !== "editor") return;
    channel.presence
      .get()
      .then((members) => {
        let n = 0;
        for (const m of members) if ((m.data as { role?: string } | undefined)?.role === "viewer") n++;
        if (!stopped && n !== viewerCount) {
          viewerCount = n;
          events.onViewerCount?.(n);
        }
      })
      .catch(() => {});
  };

  // channel.subscribe()/presence.subscribe() は async で、内部で await
  // channel.attach() する。片付け(detach)がこれより先に走ると attach が
  // reject し、.catch() が無いと "Uncaught (in promise)" になる。
  // 購読自体は同期的に登録済みなので、ここでの reject は捨ててよい
  // (接続状態は channel.on("attached"/"detached"/"failed") が扱う)。
  channel
    .subscribe("state", (msg) => {
      const data = msg.data as { settings?: Partial<OverlaySettings> } | null;
      if (data?.settings) events.onState(decompressSettings(data.settings));
    })
    .catch(() => {});
  channel
    .subscribe("req", () => {
      if (role !== "editor") return;
      const current = events.onStateRequest?.();
      if (current) publishState(current);
    })
    .catch(() => {});

  if (role === "editor") {
    channel.presence
      .subscribe(["enter", "leave", "update", "present"], refreshViewers)
      .catch(() => {});
  }

  channel.on("attached", () => {
    if (stopped) return;
    events.onStatus?.("live");
    if (role === "viewer") channel.publish("req", {});
    refreshViewers();
  });
  channel.on(["detached", "suspended"], () => {
    if (!stopped) events.onStatus?.("connecting", "reconnecting");
  });
  channel.on("failed", () => {
    if (!stopped) events.onStatus?.("connecting", "error");
  });

  // presence.enter() は attach 完了を待ってから呼ぶ。detached/initialized のまま
  // 呼ぶと Ably 内部(_enterOrUpdateClient)が catch なしの channel.attach() を
  // 走らせ、片付けと競合したときに unhandled rejection になる。
  //
  // .catch() は attach Promise 自身にも直接付ける。.then(...).catch(...) だけだと
  // catch が付くのは then が作った別の Promise で、元の attach Promise は未処理の
  // まま残るため。
  const attached = channel.attach();
  attached.catch(() => {});
  attached
    .then(() => {
      if (!stopped) return channel.presence.enter({ role });
    })
    .catch(() => {});

  return {
    unsubscribe: () => {
      stopped = true;
      channel.presence.leave().catch(() => {});
      channel.unsubscribe();
      channel.presence.unsubscribe();
      // detach() は保留中の attach を同期的に reject させる経路があるため、
      // Promise と同期 throw の両方を塞ぐ。
      try {
        void channel.detach()?.catch(() => {});
      } catch {
        /* 片付け中の例外は無視してよい: 接続状態は channel.on(...) が扱う */
      }
    },
    publish: (settings) => {
      publishState(settings);
    },
    requestState: () => {
      channel.publish("req", {}).catch(() => {});
    },
    hasViewers: () => viewerCount > 0,
  };
}
