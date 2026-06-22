import { useEffect, useRef, useState } from "react";
import type { ChaseDiagnosticConfig, ChaseRoi } from "@/lib/types";
import { useObsConnectionContext } from "@/lib/obsConnectionContext";

/** 1 サンプル分の motion energy 観測値。診断ツールで時系列ストリームされる。 */
export type ChaseDiagnosticSnapshot = {
  /** 取得時刻(performance.now() ベース、ms) */
  atMs: number;
  /** 4 ROI それぞれの生の motion energy 値(前フレーム差分の平均) */
  raw: [number, number, number, number];
  /** 直近 8 frame のローリング平均 */
  smoothed: [number, number, number, number];
};

export type ChaseDiagnosticStatus = "idle" | "running" | "error";

const SMOOTHING_FRAMES = 8;

/**
 * チェイス検知の診断フック。検知ロジック(状態機械)は持たず、
 * 4 ROI の motion energy を生データで onTick に流すだけ。
 *
 *   ループ詳細:
 *     1. config.enabled かつ obsSourceName が設定済みのときのみ動作
 *     2. polling interval (= 1000 / pollingFps ms) ごとに OBS から source 全体を取得
 *        ※ region 取得 API は v5 にないため source 全体を 1 回取得して 4 ROI を切り出す
 *     3. hidden Canvas に load → 各 ROI を getImageData
 *     4. 黄色フィルタ(R>180, G>150, B<100)を除外 + 前フレーム差分の平均 = motion energy
 *     5. 直近 SMOOTHING_FRAMES の平均を smoothed として併送
 *     6. onTick callback で snapshot を渡す
 *
 *   設計判断:
 *     - 1 回の GetSourceScreenshot で source 全体を取って、ブラウザ側で 4 ROI 切り出し
 *       (ROI ごとに 4 回呼ぶと OBS への RTT が積もるため)
 *     - 失敗(未接続/source 無し)は fail-silent で次のループへ
 *     - Canvas は 1 つ使い回し、ImageData バッファも前フレーム保持で alloc 抑制
 */
export function useChaseDiagnostic(
  config: ChaseDiagnosticConfig,
  onTick: (snap: ChaseDiagnosticSnapshot) => void,
): { status: ChaseDiagnosticStatus; lastError: string | null } {
  const { getSourceScreenshot, status: obsStatus } = useObsConnectionContext();

  const [status, setStatus] = useState<ChaseDiagnosticStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);

  // ループ内で常に最新を参照したい mutable refs
  const configRef = useRef(config);
  configRef.current = config;
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!config.enabled || !config.obsSourceName || obsStatus !== "live") {
      setStatus("idle");
      return;
    }

    let stopped = false;
    setStatus("running");
    setLastError(null);

    // Canvas + 前フレーム ImageData バッファ(各 ROI 分)
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      setStatus("error");
      setLastError("Canvas 2D context not available");
      return;
    }
    const prevRois: (ImageData | null)[] = [null, null, null, null];
    // ローリング平均用の直近サンプル
    const rolling: number[][] = [[], [], [], []];

    // OBS から取得した image を Canvas に load → 4 ROI を motion energy 化
    const processFrame = (dataUrl: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (stopped) return resolve();
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx.drawImage(img, 0, 0);

          const cfg = configRef.current;
          const raw: [number, number, number, number] = [0, 0, 0, 0];
          const smoothed: [number, number, number, number] = [0, 0, 0, 0];

          for (let i = 0; i < 4; i++) {
            const roi = cfg.rois[i];
            const energy = computeRoiMotionEnergy(
              ctx,
              roi,
              prevRois[i],
              cfg.yellowFilter,
            );
            // 計算後、現フレームを次回の差分用に保持
            prevRois[i] = safeGetImageData(ctx, roi);
            raw[i] = energy;

            // ローリング平均
            const r = rolling[i];
            r.push(energy);
            if (r.length > SMOOTHING_FRAMES) r.shift();
            smoothed[i] = r.reduce((a, b) => a + b, 0) / r.length;
          }

          onTickRef.current({
            atMs: performance.now(),
            raw,
            smoothed,
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });

    let timer: number | null = null;
    const intervalMs = Math.max(50, Math.floor(1000 / Math.max(1, config.pollingFps)));

    const tick = async () => {
      if (stopped) return;
      const cfg = configRef.current;
      try {
        const dataUrl = await getSourceScreenshot(cfg.obsSourceName);
        if (!stopped && dataUrl) {
          await processFrame(dataUrl);
        }
      } catch (e) {
        setLastError(e instanceof Error ? e.message : String(e));
      }
      if (stopped) return;
      timer = window.setTimeout(tick, intervalMs);
    };

    void tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      setStatus("idle");
    };
  }, [
    config.enabled,
    config.obsSourceName,
    config.pollingFps,
    obsStatus,
    getSourceScreenshot,
  ]);

  return { status, lastError };
}

/** ROI を Canvas から切り出し、前フレームとの差分平均を motion energy として返す。
 *  yellowFilter が true なら、両フレームで「黄色っぽい」 とみなされたピクセルを差分計算から除外する。
 *  返り値は 0..255 スケール(255 が最大変化)。 */
function computeRoiMotionEnergy(
  ctx: CanvasRenderingContext2D,
  roi: ChaseRoi,
  prev: ImageData | null,
  yellowFilter: boolean,
): number {
  const current = safeGetImageData(ctx, roi);
  if (!current || !prev) return 0;
  if (current.width !== prev.width || current.height !== prev.height) return 0;

  const a = current.data;
  const b = prev.data;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < a.length; i += 4) {
    const r1 = a[i];
    const g1 = a[i + 1];
    const b1 = a[i + 2];
    const r2 = b[i];
    const g2 = b[i + 1];
    const b2 = b[i + 2];

    // 両フレームで黄色判定 → スキルチェック等は除外
    if (yellowFilter && isYellowish(r1, g1, b1) && isYellowish(r2, g2, b2)) {
      continue;
    }
    // 輝度の差分(R+G+B の平均差)
    const lum1 = (r1 + g1 + b1) / 3;
    const lum2 = (r2 + g2 + b2) / 3;
    sum += Math.abs(lum1 - lum2);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

/** Canvas 範囲外/失敗時は null を返す安全ラッパ */
function safeGetImageData(
  ctx: CanvasRenderingContext2D,
  roi: ChaseRoi,
): ImageData | null {
  const w = Math.max(1, Math.floor(roi.width));
  const h = Math.max(1, Math.floor(roi.height));
  const x = Math.max(0, Math.floor(roi.x));
  const y = Math.max(0, Math.floor(roi.y));
  try {
    return ctx.getImageData(x, y, w, h);
  } catch {
    return null;
  }
}

/** スキルチェック等のオレンジ/黄色を判定。HSL 計算は重いので RGB 直接判定。 */
function isYellowish(r: number, g: number, b: number): boolean {
  return r > 180 && g > 150 && b < 100;
}
