import type { CSSProperties } from "react";
import type { MatchTimer } from "@/lib/types";
import { elapsedMs, fmtUp } from "@/lib/timer";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";
import { STAGE_SELECTOR } from "./helpers";

/** 左下のマッチタイマー(カウントアップ)。全レイアウト共通、style で見た目分岐。 */
export function MatchTimerView({
  mt,
  now,
  editable,
  onMove,
}: {
  mt: MatchTimer;
  now: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
}) {
  const dragProps = useDraggablePercent({
    current: { x: mt.x, y: mt.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });

  const timeStr = fmtUp(elapsedMs(mt, now) / 1000);
  const style = mt.style ?? "classic";

  const wrapperStyle: CSSProperties = {
    position: "absolute",
    left: `${mt.x}%`,
    top: `${mt.y}%`,
    color: mt.color,
    fontVariantNumeric: "tabular-nums",
  };
  const dragAttrs = editable && onMove ? dragProps : {};
  const dragClass = cn(editable && onMove && "edit-draggable");

  if (style === "pill") {
    // 角丸ピル + グラデ背景、横並び(ラベル: 時刻)
    return (
      <div
        className={dragClass}
        style={{
          ...wrapperStyle,
          display: "inline-flex",
          alignItems: "center",
          gap: `${mt.fontScale * 10}px`,
          background:
            "linear-gradient(135deg, rgba(35,35,45,0.85), rgba(15,15,22,0.85))",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          padding: `${mt.fontScale * 5}px ${mt.fontScale * 18}px`,
          borderRadius: 9999,
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
          textShadow: "1px 1px 2px rgba(0,0,0,0.85)",
          color: mt.color,
        }}
        {...dragAttrs}
      >
        {mt.label && (
          <span
            style={{
              fontSize: `${mt.fontScale * 10}px`,
              fontWeight: 700,
              letterSpacing: "0.18em",
              opacity: 0.65,
              textTransform: "uppercase",
            }}
          >
            {mt.label}
          </span>
        )}
        <span
          style={{
            fontSize: `${mt.fontScale * 24}px`,
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
          }}
        >
          {timeStr}
        </span>
      </div>
    );
  }

  if (style === "digital") {
    // LED スコアボード風: 黒地 + 光る digits、モノスペース、ベゼル
    const fontPx = mt.fontScale * 32;
    return (
      <div
        className={cn(dragClass, "match-timer-digital", mt.running && "running")}
        style={{
          ...wrapperStyle,
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#0a0d10",
          padding: "8px 16px",
          borderRadius: 8,
          border: "2px solid #2a2f36",
          boxShadow:
            "inset 0 2px 4px rgba(0,0,0,0.85), inset 0 -1px 2px rgba(60,70,85,0.4), 0 4px 12px rgba(0,0,0,0.6)",
        }}
        {...dragAttrs}
      >
        {mt.label && (
          <span
            style={{
              fontSize: `${mt.fontScale * 9}px`,
              fontWeight: 700,
              letterSpacing: "0.25em",
              opacity: 0.65,
              color: mt.color,
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            {mt.label}
          </span>
        )}
        <span
          style={{
            fontSize: `${fontPx}px`,
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            fontWeight: 900,
            letterSpacing: "0.08em",
            color: mt.color,
            // ダブル drop-shadow で LED 発光感
            textShadow: `0 0 ${fontPx * 0.25}px ${mt.color}, 0 0 ${fontPx * 0.5}px ${mt.color}80, 0 1px 0 rgba(0,0,0,0.9)`,
            lineHeight: 1,
          }}
        >
          {timeStr}
        </span>
      </div>
    );
  }

  // classic (既定): 従来の半透明角丸ボックス
  return (
    <div
      className={dragClass}
      style={{
        ...wrapperStyle,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontWeight: 900,
        fontSize: `${mt.fontScale * 28}px`,
        lineHeight: 1.05,
        background: "rgba(0,0,0,0.42)",
        padding: "6px 14px",
        borderRadius: 8,
        textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
      }}
      {...dragAttrs}
    >
      {mt.label && (
        <span
          style={{
            fontSize: "0.42em",
            fontWeight: 700,
            letterSpacing: "0.12em",
            opacity: 0.85,
          }}
        >
          {mt.label}
        </span>
      )}
      <span>{timeStr}</span>
    </div>
  );
}
