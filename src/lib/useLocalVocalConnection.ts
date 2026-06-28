import { useEffect, useRef, useState } from "react";
import type { CaptionMessage, LocalVocalConfig } from "@/lib/types";

export type LocalVocalStatus = "idle" | "connecting" | "live" | "error";

/** LocalVocal(OBS プラグイン) からの WebSocket 受信フック。
 *
 *  設計判断:
 *   - 既存 useObsConnection.ts のパターンを踏襲(指数バックオフ再接続、Context で 1 本化)
 *   - LocalVocal の WebSocket メッセージスキーマは複数あり得るので、緩めにパースして
 *     失敗時は無視(=次のメッセージに期待)
 *   - 受信した最新メッセージ 1 件を state として保持。親は incoming を CaptionView に渡す
 *
 *  LocalVocal の WebSocket スキーマ(現状の参考):
 *    { type: "transcription", text: "...", translation: "...", final: true/false, ... }
 *  実装は柔軟に。text/translation/final いずれかが取れれば動く。 */
export function useLocalVocalConnection(config: LocalVocalConfig): {
  status: LocalVocalStatus;
  error: string | null;
  /** 受信した最新メッセージ。新しいメッセージが届くたびに新しい参照になる。 */
  incoming: CaptionMessage | null;
} {
  const [status, setStatus] = useState<LocalVocalStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<CaptionMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const stoppedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    stoppedRef.current = false;

    const cleanup = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }
      setStatus("idle");
      setError(null);
    };

    if (!config.enabled || !config.url) {
      cleanup();
      return () => {
        stoppedRef.current = true;
      };
    }

    const scheduleRetry = () => {
      if (stoppedRef.current) return;
      const delay = Math.min(30_000, 2_000 * Math.pow(2, retryCountRef.current));
      retryCountRef.current += 1;
      retryTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (stoppedRef.current) return;
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          /* ignore */
        }
        wsRef.current = null;
      }

      setStatus("connecting");
      setError(null);

      let ws: WebSocket;
      try {
        ws = new WebSocket(config.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
        scheduleRetry();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (stoppedRef.current) return;
        retryCountRef.current = 0;
        setStatus("live");
        setError(null);
      };

      ws.onerror = () => {
        if (stoppedRef.current) return;
        setError("WebSocket error");
        setStatus("error");
      };

      ws.onclose = () => {
        if (stoppedRef.current) return;
        setStatus("connecting");
        scheduleRetry();
      };

      ws.onmessage = (ev) => {
        if (stoppedRef.current) return;
        try {
          const data = JSON.parse(String(ev.data));
          const msg = parseLocalVocalMessage(data);
          if (msg) setIncoming(msg);
        } catch {
          /* JSON でない or 期待スキーマでない場合は無視 */
        }
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      cleanup();
    };
  }, [config.enabled, config.url]);

  return { status, error, incoming };
}

/** LocalVocal メッセージを CaptionMessage に変換。
 *  partial(final=false)は無視(broadcast 頻度を抑えるため確定のみ)。
 *  ja/en が両方空なら null を返す(意味のないメッセージは捨てる)。 */
function parseLocalVocalMessage(data: unknown): CaptionMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;

  // final 判定: final / is_final / done のいずれか true(または欠落で true 扱い)
  const isFinal =
    obj.final === true ||
    obj.is_final === true ||
    obj.done === true ||
    (obj.final === undefined && obj.is_final === undefined && obj.done === undefined);

  // 暫定(partial)はスキップ
  if (!isFinal) return null;

  // テキスト抽出: 複数のキー候補から探す
  const ja = pickString(obj, ["text", "transcription", "original", "ja", "source"]);
  const en = pickString(obj, ["translation", "translated", "en", "target"]);

  if (!ja && !en) return null;

  return {
    id: typeof obj.id === "string" ? obj.id : generateId(),
    ja: ja ?? "",
    en: en ?? "",
    receivedAtMs: Date.now(),
    durationMs: 6000,
    isFinal: true,
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
