import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { RemoteCommand } from "./hotkeyActions";

/**
 * リモコン⇔エディタ間の command broadcast。
 * - エディタ側(host): 受信したコマンドをディスパッチ
 * - リモコン側(remote): コマンドを送信
 *
 * 既存の overlay state 同期(realtimeSync.ts)とは別チャンネルで運用し、
 * 役割の境界を明確にする(state は editor → viewer、command は remote → editor)。
 */

const channelName = (roomId: string) => `cmd:${roomId}`;

export type CommandStatus =
  | "connecting"
  | "live"
  | "offline"
  | "error"
  | "idle";

export type CommandEvents = {
  onCommand?: (cmd: RemoteCommand) => void;
  onStatus?: (s: CommandStatus, err?: string) => void;
};

export type CommandHandle = {
  unsubscribe: () => void;
  send: (cmd: RemoteCommand) => void;
};

export function joinCommandChannel(
  roomId: string,
  role: "host" | "remote",
  events: CommandEvents,
): CommandHandle | null {
  const client = getSupabase();
  if (!client) {
    events.onStatus?.("error", "Supabase が未設定です");
    return null;
  }

  let stopped = false;
  let channel: RealtimeChannel | null = null;
  let retryCount = 0;
  let retryTimer: number | null = null;

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

    const ch = client.channel(channelName(roomId), {
      config: { broadcast: { self: false } },
    });

    ch.on("broadcast", { event: "cmd" }, (msg) => {
      // host だけがコマンドを受信して実行する。remote は他の remote の送信を無視。
      if (role !== "host") return;
      const payload = msg.payload as { kind?: RemoteCommand } | null;
      if (payload?.kind) events.onCommand?.(payload.kind);
    });

    ch.subscribe((status, err) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        retryCount = 0;
        events.onStatus?.("live");
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
    send: (cmd) => {
      if (!channel) return;
      channel.send({ type: "broadcast", event: "cmd", payload: { kind: cmd } });
    },
  };
}
