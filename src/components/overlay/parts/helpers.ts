import type { CSSProperties } from "react";
import type { Line, TextLine } from "@/lib/types";

/** ドラッグハンドラがこのクラスを持つ親要素を探す(useDraggablePercent 用)。 */
export const STAGE_SELECTOR = ".overlay-stage";

export const hexToRgba = (hex: string | undefined, opacity: number): string => {
  if (!hex || hex.length < 7 || !hex.startsWith("#")) {
    return `rgba(45, 45, 45, ${opacity})`;
  }
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const lineText = (l: Line): string => {
  const t = l as TextLine;
  if (t.segments && t.segments.length > 0) {
    return t.segments.map((s) => s.text).join("");
  }
  return t.text || "";
};

export const lineWhitespace = (l: Line): CSSProperties["whiteSpace"] =>
  lineText(l).includes("\n") ? "pre" : "nowrap";

export const lineColorStyle = (l: Line): CSSProperties => {
  const t = l as TextLine;
  return !t.segments && t.color ? { color: t.color } : {};
};

export const lineBgStyle = (l: Line): CSSProperties => {
  if (l.showBackground && l.backgroundColor) {
    const opacity = l.backgroundOpacity ?? 1;
    return { backgroundColor: hexToRgba(l.backgroundColor, opacity) };
  }
  return {};
};

// 残時間で色変化（灰 → 黄 → 赤）。ratio: 1=開始(灰) → 0=終了(赤)
const TC_GRAY = [90, 92, 100];
const TC_YELLOW = [255, 214, 0];
const TC_RED = [255, 42, 42];
const mixRgb = (a: number[], b: number[], t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
export const timerColor = (ratio: number): string => {
  const r = Math.max(0, Math.min(1, ratio));
  return r >= 0.5
    ? mixRgb(TC_GRAY, TC_YELLOW, (1 - r) / 0.5)
    : mixRgb(TC_YELLOW, TC_RED, (0.5 - r) / 0.5);
};

export const RAINBOW =
  "conic-gradient(from var(--ringAngle), #ff004c, #ff7a18, #ffe600, #29ff5e, #00e5ff, #2f6bff, #c04cff, #ff004c)";
// 指定色を流す（白いハイライトが回って指定色が光って流れて見える）
export const FLOW =
  "conic-gradient(from var(--ringAngle), var(--glow), #ffffff, var(--glow), var(--glow), var(--glow))";
