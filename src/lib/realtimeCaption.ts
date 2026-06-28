import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import type { CaptionMessage } from "./types";

/**
 * Caption broadcast 専用チャネル。
 * state(overlay:<roomId>) や command(cmd:<roomId>) とは別に caption:<roomId> を使う。
 *
 * 設計理由:
 *   - state は Tier1 debounce (1500ms) が掛かっており字幕には遅すぎる
 *   - command は send/receive の対称性が違うので別経路
 *   - 字幕は「即時送って即時消える」 性質なので独立した低遅延チャネルが最適
 */

const channelName = (roomId: string) => `caption:${roomId}`;

export type CaptionStatus =
  | "connecting"
  | "live"
  | "offline"
  | "error"
  | "idle";

export type CaptionEvents = {
  /** メッセージ受信時に呼ばれる(viewer 側) */
  onMessage?: (msg: CaptionMessage) => void;
  /** 接続状態の変化(オプション) */
  onStatus?: (s: CaptionStatus, err?: string) => void;
};

export type CaptionHandle = {
  unsubscribe: () => void;
  /** メッセージを broadcast(publisher 側) */
  publish: (msg: CaptionMessage) => void;
};

/** 指定 roomId の caption チャネルに接続する。
 *  role: "publisher"(エディタ=送信側)/ "viewer"(/overlay=受信側) */
export function joinCaptionChannel(
  roomId: string,
  role: "publisher" | "viewer",
  events: CaptionEvents,
): CaptionHandle | null {
  const client = getSupabase();
  if (!client) {
    events.onStatus?.("error", "Supabase 未設定");
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

    ch.on("broadcast", { event: "caption" }, (msg) => {
      if (role !== "viewer") return;
      const payload = msg.payload as { message?: CaptionMessage } | null;
      if (payload?.message) {
        events.onMessage?.(payload.message);
      }
    });

    ch.subscribe((status) => {
      if (stopped) return;
      if (status === "SUBSCRIBED") {
        retryCount = 0;
        events.onStatus?.("live");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        events.onStatus?.("connecting", status);
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
    publish: (message) => {
      if (!channel) return;
      channel.send({
        type: "broadcast",
        event: "caption",
        payload: { message },
      });
    },
  };
}
