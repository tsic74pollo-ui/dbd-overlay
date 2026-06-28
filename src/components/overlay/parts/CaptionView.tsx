import { useEffect, useState } from "react";
import type { CaptionMessage, CaptionWidget } from "@/lib/types";

/** 画面下に YouTube 風キャプションを表示する。
 *
 *  - ローカル state にメッセージキューを保持(broadcast には乗らない)
 *  - 新規メッセージは下からスライドイン、durationMs 経過でフェードアウト
 *  - 同時表示 maxVisibleLines まで(超えた古いものから消える)
 *  - 同 id は重複追加しない(broadcast の echo / 再受信対策) */
export function CaptionView({
  config,
  incoming,
}: {
  config: CaptionWidget;
  /** 受信したメッセージ(親が useCaptionReceiver から渡す)。
   *  ID 同一なら queue に追加せずスキップする。null/undefined OK。 */
  incoming: CaptionMessage | null;
}) {
  // 画面に表示中の queue。各要素は CaptionMessage + 描画開始時刻
  const [queue, setQueue] = useState<
    Array<CaptionMessage & { shownAtMs: number }>
  >([]);

  // 新規メッセージを queue に追加
  useEffect(() => {
    if (!incoming) return;
    setQueue((q) => {
      // 重複排除
      if (q.some((m) => m.id === incoming.id)) return q;
      const next = [...q, { ...incoming, shownAtMs: Date.now() }];
      // maxVisibleLines を超えた古いものから捨てる
      while (next.length > Math.max(1, config.maxVisibleLines)) {
        next.shift();
      }
      return next;
    });
  }, [incoming, config.maxVisibleLines]);

  // durationMs 経過したメッセージを定期的に削除
  useEffect(() => {
    if (queue.length === 0) return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setQueue((q) => q.filter((m) => now - m.shownAtMs < m.durationMs));
    }, 250);
    return () => clearInterval(interval);
  }, [queue.length]);

  if (queue.length === 0) return null;

  const bg = hexToRgba(config.bgColor, config.bgOpacity);

  return (
    <div
      style={{
        position: "absolute",
        left: `${config.x}%`,
        top: `${config.y}%`,
        width: `${config.width}%`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        pointerEvents: "none",
        zIndex: 40,
        fontFamily: 'Arial, "Noto Sans JP", sans-serif',
      }}
    >
      {queue.map((msg) => {
        const elapsed = Date.now() - msg.shownAtMs;
        // 最後の 600ms でフェードアウト
        const fadeStart = Math.max(0, msg.durationMs - 600);
        const opacity =
          elapsed < fadeStart
            ? 1
            : Math.max(0, 1 - (elapsed - fadeStart) / 600);
        return (
          <div
            key={msg.id}
            style={{
              background: bg,
              padding: `${config.fontScale * 6}px ${config.fontScale * 18}px`,
              borderRadius: 6,
              textAlign: "center",
              maxWidth: "100%",
              opacity,
              transition: "opacity 200ms linear",
              textShadow: "1px 1px 3px rgba(0,0,0,0.95)",
              animation: "captionSlideIn 280ms ease-out",
            }}
          >
            {config.showJa && msg.ja && (
              <div
                style={{
                  fontSize: `${config.fontScale * 16}px`,
                  color: config.jaColor,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  letterSpacing: "0.02em",
                }}
              >
                {msg.ja}
              </div>
            )}
            {config.showEn && msg.en && (
              <div
                style={{
                  fontSize: `${config.fontScale * 18}px`,
                  color: config.enColor,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  marginTop: config.showJa && msg.ja ? 2 : 0,
                }}
              >
                {msg.en}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(0,0,0,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${opacity})`;
}
