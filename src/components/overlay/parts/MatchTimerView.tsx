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

  if (style === "bracket") {
    // esports 競技風: 角括弧フレーム + 上ラベル、背景透過
    return (
      <div
        className={dragClass}
        style={{
          ...wrapperStyle,
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "flex-start",
          fontWeight: 900,
          lineHeight: 1,
          textShadow: "2px 2px 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.7)",
        }}
        {...dragAttrs}
      >
        {mt.label && (
          <span
            style={{
              fontSize: `${mt.fontScale * 11}px`,
              fontWeight: 700,
              letterSpacing: "0.3em",
              opacity: 0.85,
              color: mt.color,
              marginBottom: 4,
              paddingLeft: 8,
            }}
          >
            {mt.label}
          </span>
        )}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: `${mt.fontScale * 8}px`,
            fontSize: `${mt.fontScale * 32}px`,
            fontFamily: "'Roboto Mono', 'Courier New', monospace",
            letterSpacing: "0.04em",
            color: mt.color,
          }}
        >
          <span
            style={{
              fontWeight: 400,
              opacity: 0.6,
              fontSize: "0.95em",
              transform: "translateY(-1px)",
            }}
          >
            [
          </span>
          <span style={{ fontWeight: 900 }}>{timeStr}</span>
          <span
            style={{
              fontWeight: 400,
              opacity: 0.6,
              fontSize: "0.95em",
              transform: "translateY(-1px)",
            }}
          >
            ]
          </span>
        </div>
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
