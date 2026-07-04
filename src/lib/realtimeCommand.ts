// Remote ⇔ editor command broadcast — Ably transport (migrated 2026-06-29).
// Channel `dbd:cmd:<roomId>`. Public API unchanged.
import type { RealtimeChannel } from "ably";
import { getAbly } from "./ably";
import type { RemoteCommand } from "./hotkeyActions";

export type CommandStatus = "connecting" | "live" | "offline" | "error" | "idle";

export type CommandEvents = {
  onCommand?: (cmd: RemoteCommand) => void;
  onStatus?: (s: CommandStatus, err?: string) => void;
};

export type CommandHandle = {
  unsubscribe: () => void;
  send: (cmd: RemoteCommand) => void;
};

const channelName = (roomId: string) => `dbd:cmd:${roomId}`;

export function joinCommandChannel(
  roomId: string,
  role: "host" | "remote",
  events: CommandEvents,
): CommandHandle | null {
  const client = getAbly();
  if (!client) {
    events.onStatus?.("error", "Ably 未設定");
    return null;
  }

  let stopped = false;
  const channel: RealtimeChannel = client.channels.get(channelName(roomId));

  events.onStatus?.("connecting");

  channel.subscribe("cmd", (msg) => {
    if (role !== "host") return; // host だけがコマンドを実行
    const data = msg.data as { kind?: RemoteCommand } | null;
    if (data?.kind) events.onCommand?.(data.kind);
  });

  channel.on("attached", () => { if (!stopped) events.onStatus?.("live"); });
  channel.on(["detached", "suspended"], () => { if (!stopped) events.onStatus?.("connecting", "reconnecting"); });
  channel.on("failed", () => { if (!stopped) events.onStatus?.("connecting", "error"); });
  channel.attach();

  return {
    unsubscribe: () => {
      stopped = true;
      channel.unsubscribe();
      channel.detach();
    },
    send: (cmd) => {
      channel.publish("cmd", { kind: cmd });
    },
  };
}
