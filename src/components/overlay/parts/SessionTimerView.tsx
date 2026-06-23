import type { SessionTimer } from "@/lib/types";
import { elapsedMs, fmtUp } from "@/lib/timer";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";
import { STAGE_SELECTOR } from "./helpers";

/** 通しタイマー(OBS 録画通し時間・カウントアップ)。全レイアウト共通。 */
export function SessionTimerView({
  st,
  now,
  editable,
  onMove,
}: {
  st: SessionTimer;
  now: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
}) {
  const dragProps = useDraggablePercent({
    current: { x: st.x, y: st.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });
  return (
    <div
      className={cn(editable && onMove && "edit-draggable")}
      style={{
        position: "absolute",
        left: `${st.x}%`,
        top: `${st.y}%`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: st.color,
        fontSize: `${st.fontScale * 22}px`,
        lineHeight: 1.05,
        background: "rgba(0,0,0,0.42)",
        padding: "4px 10px",
        borderRadius: 6,
        textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
      }}
      {...(editable && onMove ? dragProps : {})}
    >
      {st.label && (
        <span
          style={{
            fontSize: "0.42em",
            fontWeight: 700,
            letterSpacing: "0.12em",
            opacity: 0.9,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {st.running && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FF3B3B",
                boxShadow: "0 0 6px rgba(255,59,59,0.85)",
              }}
            />
          )}
          {st.label}
        </span>
      )}
      <span>{fmtUp(elapsedMs(st, now) / 1000)}</span>
    </div>
  );
}
