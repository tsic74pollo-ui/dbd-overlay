import type { MatchTimer } from "@/lib/types";
import { elapsedMs, fmtUp } from "@/lib/timer";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";
import { STAGE_SELECTOR } from "./helpers";

/** 左下のマッチタイマー(カウントアップ)。全レイアウト共通。 */
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
  return (
    <div
      className={cn(editable && onMove && "edit-draggable")}
      style={{
        position: "absolute",
        left: `${mt.x}%`,
        top: `${mt.y}%`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
        color: mt.color,
        fontSize: `${mt.fontScale * 28}px`,
        lineHeight: 1.05,
        background: "rgba(0,0,0,0.42)",
        padding: "6px 14px",
        borderRadius: 8,
        textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
      }}
      {...(editable && onMove ? dragProps : {})}
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
      <span>{fmtUp(elapsedMs(mt, now) / 1000)}</span>
    </div>
  );
}
