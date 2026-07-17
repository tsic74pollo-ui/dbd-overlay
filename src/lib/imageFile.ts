// 画像ファイル → 同期ペイロードに載せられる dataURL への変換。
//
// settings は丸ごと Ably broadcast されるため、画像 dataURL が大きいと
// 1メッセージ上限(無料枠 64KiB)を超えて OBS 側に「黙って届かない」。
// そこで canvas で縮小しながら上限内に収まるまで段階的に試し、
// どうしても収まらなければ明示エラーを返す(silent failure を作らない)。
//
// 透過ロゴが主用途なので PNG を優先し、JPEG(アルファ消失)は最終手段。

export type ImageFileResult =
  | { ok: true; dataUrl: string; scaled: boolean }
  | { ok: false; error: string };

// dataURL の文字数上限。binary ≈ chars×3/4 なので ~45KB 相当。
// lines/その他設定と合算しても Ably 64KiB に収まる安全マージン。
const DATA_URL_MAX_CHARS = 60_000;

const loadImageFromSrc = (src: string, revoke = false): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (revoke) URL.revokeObjectURL(src);
      resolve(img);
    };
    img.onerror = () => {
      if (revoke) URL.revokeObjectURL(src);
      reject(new Error("画像として読み込めませんでした"));
    };
    img.src = src;
  });

const loadImage = (file: File): Promise<HTMLImageElement> =>
  loadImageFromSrc(URL.createObjectURL(file), true);

const drawToDataUrl = (
  img: HTMLImageElement,
  maxDim: number,
  type: "image/png" | "image/jpeg",
): string => {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas が使えない環境です");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL(type, type === "image/jpeg" ? 0.85 : undefined);
};

/** 画像ファイルを読み、上限内の dataURL に変換する(必要なら自動縮小)。 */
export async function readImageFileScaled(file: File): Promise<ImageFileResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "読み込み失敗" };
  }

  // JPEG 由来はアルファが無いので最初から JPEG。それ以外は透過保持のため PNG。
  const preferJpeg = file.type === "image/jpeg";
  const maxNatural = Math.max(img.naturalWidth, img.naturalHeight);

  const attempts: Array<{ dim: number; type: "image/png" | "image/jpeg" }> = [
    { dim: 512, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 384, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 256, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 160, type: preferJpeg ? "image/jpeg" : "image/png" },
    // PNG でどうしても収まらないときの最終手段(透過は失われる)
    { dim: 512, type: "image/jpeg" },
    { dim: 256, type: "image/jpeg" },
  ];

  try {
    for (const a of attempts) {
      const dataUrl = drawToDataUrl(img, a.dim, a.type);
      if (dataUrl.length <= DATA_URL_MAX_CHARS) {
        return { ok: true, dataUrl, scaled: a.dim < maxNatural || a.type !== file.type };
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "変換失敗" };
  }
  return {
    ok: false,
    error: "画像を十分に圧縮できませんでした。シンプルな画像(ロゴ等)を使ってください",
  };
}

/** 保存済みの dataURL を maxChars 以内に再縮小する。
 *  用途: readImageFileScaled 導入(2026-07-11)以前にアップロードされた無圧縮画像や、
 *  画像が複数あって合算が Ably 64KiB を超えるケースの自動修復(broadcastFit.ts)。
 *  収まらなければ null(呼び出し側は元のまま維持)。 */
export async function shrinkDataUrl(
  dataUrl: string,
  maxChars: number,
): Promise<string | null> {
  if (dataUrl.length <= maxChars) return dataUrl;
  let img: HTMLImageElement;
  try {
    img = await loadImageFromSrc(dataUrl);
  } catch {
    return null;
  }
  const preferJpeg = dataUrl.startsWith("data:image/jpeg");
  const attempts: Array<{ dim: number; type: "image/png" | "image/jpeg" }> = [
    { dim: 512, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 384, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 256, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 160, type: preferJpeg ? "image/jpeg" : "image/png" },
    { dim: 512, type: "image/jpeg" },
    { dim: 256, type: "image/jpeg" },
    { dim: 128, type: "image/jpeg" },
  ];
  try {
    for (const a of attempts) {
      const out = drawToDataUrl(img, a.dim, a.type);
      if (out.length <= maxChars) return out;
    }
  } catch {
    return null;
  }
  return null;
}
