import type { PerkCover } from "./types";

// OverlayView の .perk-diamond-inner の inset(--ringW) と一致させること
export const RING_PX = 5;

export type Resolution = { key: string; label: string; w: number; h: number };

export const RESOLUTIONS: Resolution[] = [
  { key: "1080p", label: "1920 × 1080", w: 1920, h: 1080 },
  { key: "1440p", label: "2560 × 1440", w: 2560, h: 1440 },
  { key: "2160p", label: "3840 × 2160", w: 3840, h: 2160 },
];

// カバーの実寸（px）。box=枠込みの外接矩形、inner=画像が実際に入る領域（枠を除く）。
export function coverDims(cover: PerkCover, resW: number, resH: number) {
  const ringW = cover.glow.enabled ? RING_PX : 0;
  const boxW = (cover.width / 100) * resW;
  const boxH = (cover.height / 100) * resH;
  const innerW = Math.max(1, Math.round(boxW - ringW * 2));
  const innerH = Math.max(1, Math.round(boxH - ringW * 2));
  return { ringW, boxW: Math.round(boxW), boxH: Math.round(boxH), innerW, innerH };
}

export type TemplateOptions = {
  resW: number;
  resH: number;
  scale: number;
  showDiamond: boolean;
  showSafeArea: boolean;
  shadeCorners: boolean;
};

// 内側ボックスのひし形（辺の中点を結ぶ＝OverlayView の clip-path と同じ）。center基準で縮小可。
function diamondPoints(w: number, h: number, s: number): [number, number][] {
  const cx = w / 2;
  const cy = h / 2;
  const base: [number, number][] = [
    [w / 2, 0],
    [w, h / 2],
    [w / 2, h],
    [0, h / 2],
  ];
  return base.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s] as [number, number]);
}

function tracePath(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

// 現在のカバー設定からひし形ガイド付き透明PNGを生成してダウンロードする。
// 画像スロット(inner)と同じ縦横比なので、fit=fill（または比率一致のcontain）でぴったり一致する。
export function downloadCoverTemplate(cover: PerkCover, opts: TemplateOptions): void {
  const { resW, resH, scale, showDiamond, showSafeArea, shadeCorners } = opts;
  const { innerW, innerH } = coverDims(cover, resW, resH);
  const W = innerW * scale;
  const H = innerH * scale;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H); // 透明背景

  // 角（ひし形クリップで切れる範囲）を薄く塗って可視化
  if (shadeCorners) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 70, 70, 0.13)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    tracePath(ctx, diamondPoints(W, H, 1));
    ctx.fill();
    ctx.restore();
  }

  // セーフエリア（内側の小さいひし形・点線）— 重要な要素はこの内側に
  if (showSafeArea) {
    ctx.save();
    tracePath(ctx, diamondPoints(W, H, 0.82));
    ctx.lineWidth = Math.max(1, Math.round(scale * 1.2));
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.setLineDash([scale * 6, scale * 5]);
    ctx.stroke();
    ctx.restore();
  }

  // ひし形ガイド（クリップ境界）— この外側は表示されない
  if (showDiamond) {
    ctx.save();
    tracePath(ctx, diamondPoints(W, H, 1));
    ctx.lineWidth = Math.max(2, Math.round(scale * 1.6));
    ctx.strokeStyle = "rgba(0, 200, 255, 0.95)";
    ctx.stroke();
    ctx.restore();
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perk-cover-template_${resW}x${resH}_${innerW}x${innerH}@${scale}x.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
