import type { RealtimeChannel } from "@supabase/supabase-js";
import type { OverlaySettings } from "./types";
import { getSupabase } from "./supabase";
import { compressSettings, decompressSettings } from "./settingsCompress";

export type SyncEvents = {
  onState: (settings: OverlaySettings) => void;
  onStateRequest?: () => OverlaySettings | null;
  onStatus?: (status: "connecting" | "live" | "offline" | "error", err?: string) => void;
  /** Editor-only: viewer 数が変わったら呼ばれる。publish のゲートに使う */
  onViewerCount?: (count: number) => void;
};

const channelName = (roomId: string) => `overlay:${roomId}`;

type Handle = {
  unsubscribe: () => void;
  publish: (settings: OverlaySettings) => void;
  requestState: () => void;
  /** Editor-only: 1人以上の viewer が presence で見えているか */
  hasViewers: () => boolean;
};

export function joinRoom(
  roomId: string,
  role: "editor" | "viewer",
  events: SyncEvents,
): Handle | null {
  const client = getSupabase();
  if (!client) {
    events.onStatus?.("error", "Supabase が未設定です。.env.local を設定してください。");
    return null;
  }

  let stopped = false;
  let channel: RealtimeChannel | null = null;
  let retryCount = 0;
  let retryTimer: number | null = null;
  let viewerCount = 0;

  const scheduleRetry = () => {
    if (stopped) return;
    const delay = Math.min(30_000, 1000 * Math.pow(2, retryCount));
    retryCount += 1;
    events.onStatus?.("connecting", `retry in ${Math.round(delay / 1000)}s`);
    retryTimer = window.setTimeout(connect, delay);
  };

  const connect = () => {
    if (stopped) return;

    if (channel) {
      channel.unsubscribe().catch(() => {});
      client.removeChannel(channel);
      channel = null;
    }

    events.onStatus?.("connecting");

    // 同じ部屋に複数クライアントが入る場合のユニーク key
    const presenceKey = `${role}-${Math.random().toString(36).slice(2, 10)}`;

    const ch = client.channel(channelName(roomId), {
      config: {
        broadcast: { self: false },
        presence: { key: presenceKey },
      },
    });

    ch.on("broadcast", { event: "state" }, (msg) => {
      const payload = msg.payload as { settings?: Partial<OverlaySettings> } | null;
      if (payload?.settings) {
        events.onState(decompressSettings(payload.settings));
      }
    });

    ch.on("broadcast", { event: "state-request" }, () => {
      if (role !== "editor") return;
      const current = events.onStateRequest?.();
      if (current) {
        ch.send({
          type: "broadcast",
          event: "state",
          payload: { settings: compressSettings(current) },
        });
      }
    });

    // presence: editor 側で viewer 数を観測
    ch.on("presence", { event: "sync" }, () => {
      if (role !== "editor") return;
      const state = ch.presenceState() as Record<string, Array<{ role?: string }>>;
      let count = 0;
      for (const entries of Object.values(state)) {
        for (const e of entries) {
          if (e.role === "viewer") count++;
        }
      }
      if (count !== viewerCount) {
        viewerCount = count;
        events.onViewerCount?.(count);
      }
    });

    ch.subscribe(async (status, err) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        retryCount = 0;
        events.onStatus?.("live");
        // 自分の role を presence に公開
        try {
          await ch.track({ role });
        } catch {
          /* presence track is best-effort */
        }
        if (role === "viewer") {
          ch.send({ type: "broadcast", event: "state-request", payload: {} });
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        events.onStatus?.(
          "connecting",
          `${status}${err ? `: ${err.message}` : ""}`,
        );
        scheduleRetry();
      } else if (status === "CLOSED") {
        if (!stopped) {
          events.onStatus?.("connecting", "reconnecting");
          scheduleRetry();
        }
      }
    });

    channel = ch;
  };

  connect();

  return {
    unsubscribe: () => {
      stopped = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (channel) {
        channel.unsubscribe().catch(() => {});
        client.removeChannel(channel);
        channel = null;
      }
    },
    publish: (settings) => {
      if (!channel) return;
      channel.send({
        type: "broadcast",
        event: "state",
        payload: { settings: compressSettings(settings) },
      });
    },
    requestState: () => {
      if (!channel) return;
      channel.send({ type: "broadcast", event: "state-request", payload: {} });
    },
    hasViewers: () => viewerCount > 0,
  };
}
