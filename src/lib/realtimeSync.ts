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
  if (!client) {
    events.onStatus?.("error", "Ably が未設定です。VITE_ABLY_KEY を設定してください。");
    return null;
  }

  let stopped = false;
  let viewerCount = 0;
  const channel: RealtimeChannel = client.channels.get(channelName(roomId));

  events.onStatus?.("connecting");

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

  channel.subscribe("state", (msg) => {
    const data = msg.data as { settings?: Partial<OverlaySettings> } | null;
    if (data?.settings) events.onState(decompressSettings(data.settings));
  });
  channel.subscribe("req", () => {
    if (role !== "editor") return;
    const current = events.onStateRequest?.();
    if (current) channel.publish("state", { settings: compressSettings(current) });
  });

  if (role === "editor") {
    channel.presence.subscribe(["enter", "leave", "update", "present"], refreshViewers);
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

  channel.presence.enter({ role }).catch(() => {});
  channel.attach();

  return {
    unsubscribe: () => {
      stopped = true;
      channel.presence.leave().catch(() => {});
      channel.unsubscribe();
      channel.presence.unsubscribe();
      channel.detach();
    },
    publish: (settings) => {
      channel.publish("state", { settings: compressSettings(settings) });
    },
    requestState: () => {
      channel.publish("req", {});
    },
    hasViewers: () => viewerCount > 0,
  };
}
