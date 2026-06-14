import { useCallback, useRef } from "react";

type Pos = { x: number; y: number };

type Options = {
  /** Current x,y in percent (0–100) relative to the stage element. */
  current: Pos;
  /** CSS selector that resolves to the stage element used as 0–100 % reference. */
  stageSelector: string;
  /** Called continuously during drag with the new x,y in percent. */
  onDrag: (next: Pos) => void;
  /** Clamp the result to 0–100 (default true). */
  clamp?: boolean;
};

/**
 * Pointer-based drag handler that reports a new (x, y) in percent units
 * relative to a stage container. Designed for repositioning overlay
 * elements on a preview/canvas.
 *
 * Usage:
 *   const dragHandlers = useDraggablePercent({
 *     current: { x: pc.x, y: pc.y },
 *     stageSelector: ".overlay-stage",
 *     onDrag: ({ x, y }) => onMovePerkCover(x, y),
 *   });
 *   <div {...dragHandlers}>...</div>
 */
export function useDraggablePercent({
  current,
  stageSelector,
  onDrag,
  clamp = true,
}: Options) {
  const state = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    stageW: number;
    stageH: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return; // primary button only
      const stage = (e.currentTarget as HTMLElement).closest(
        stageSelector,
      ) as HTMLElement | null;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      state.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        baseX: current.x,
        baseY: current.y,
        stageW: rect.width,
        stageH: rect.height,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    },
    [current.x, current.y, stageSelector],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const s = state.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const dx = ((e.clientX - s.startX) / s.stageW) * 100;
      const dy = ((e.clientY - s.startY) / s.stageH) * 100;
      let nx = s.baseX + dx;
      let ny = s.baseY + dy;
      if (clamp) {
        nx = Math.max(0, Math.min(100, nx));
        ny = Math.max(0, Math.min(100, ny));
      }
      onDrag({ x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 });
    },
    [onDrag, clamp],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!state.current || state.current.pointerId !== e.pointerId) return;
    state.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };
}
