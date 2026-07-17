// settings が Ably の1メッセージ上限(64KiB)に収まるよう画像を自動縮小する。
//
// 背景(2026-07-17 OBS無表示事件): readImageFileScaled 導入以前にアップロードされた
// 無圧縮 dataURL や、画像2枚(ロゴ+パーク隠し)の合算超過があると、publish が
// 40009 で拒否され「エディタは Live 表示なのに OBS に何も届かない」silent failure
// になっていた。エディタ起動時と設定変更時にここで自動修復し、localStorage にも
// 縮小後の値を保存して恒久的に直す。
import { useEffect } from "react";
import type { OverlaySettings } from "./types";
import { compressSettings } from "./settingsCompress";
import { shrinkDataUrl } from "./imageFile";
import { useAppStore } from "@/store/appStore";

/** realtimeSync の事前検査(65,000)より先に発動するよう少し低めに置く。 */
export const BROADCAST_FIT_MAX_BYTES = 63_000;

const payloadBytes = (s: OverlaySettings) =>
  JSON.stringify({ settings: compressSettings(s) }).length;

type ImageSlot = {
  get: (s: OverlaySettings) => string | null | undefined;
  set: (s: OverlaySettings, v: string) => OverlaySettings;
};

// settings 内で dataURL 画像を持ち得る場所。増えたらここに足す。
const IMAGE_SLOTS: ImageSlot[] = [
  {
    get: (s) => s.iconImage,
    set: (s, v) => ({ ...s, iconImage: v }),
  },
  {
    get: (s) => s.perkCover?.image,
    set: (s, v) => (s.perkCover ? { ...s, perkCover: { ...s.perkCover, image: v } } : s),
  },
];

const isDataUrl = (v: string | null | undefined): v is string =>
  !!v && v.startsWith("data:");

/**
 * 上限超過なら画像を縮小した settings を返す。修正不要/不可能なら null。
 * 画像以外(マッチログ等)が原因の超過はここでは直せない — その場合も null を
 * 返し、realtimeSync 側の publish 検査がエラーとして表面化させる。
 */
export async function fitSettingsForBroadcast(
  s: OverlaySettings,
): Promise<OverlaySettings | null> {
  if (payloadBytes(s) <= BROADCAST_FIT_MAX_BYTES) return null;

  const present = IMAGE_SLOTS.filter((slot) => isDataUrl(slot.get(s)));
  if (present.length === 0) return null;

  // 画像以外のサイズを引いた残りを、存在する画像で均等割りした予算にする
  const imageChars = present.reduce((n, slot) => n + (slot.get(s) as string).length, 0);
  const nonImage = payloadBytes(s) - imageChars;
  const budget = Math.max(20_000, BROADCAST_FIT_MAX_BYTES - nonImage);
  const perImage = Math.floor(budget / present.length);

  let cur = s;
  let changed = false;
  for (const slot of present) {
    const v = slot.get(cur) as string;
    if (v.length <= perImage) continue;
    const shrunk = await shrinkDataUrl(v, perImage);
    if (shrunk && shrunk !== v) {
      cur = slot.set(cur, shrunk);
      changed = true;
    }
  }
  return changed ? cur : null;
}

/**
 * エディタ起動時＋設定変更時(2秒デバウンス)に全ルームを検査して自動修復する。
 * 修復結果は store 経由で localStorage にも保存されるため一度直れば再発しない。
 * (修復→store更新→本フックが再走→サイズ内なので何もしない、で必ず収束する)
 */
export function useBroadcastFitHealer() {
  const setRoomSettings = useAppStore((st) => st.setRoomSettings);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;
    let running = false;

    const heal = async () => {
      if (running) return; // 多重実行防止(実行中の変更は次のデバウンスで拾う)
      running = true;
      try {
        for (const room of useAppStore.getState().rooms) {
          const fitted = await fitSettingsForBroadcast(room.settings);
          if (disposed) return;
          if (fitted) setRoomSettings(room.id, fitted);
        }
      } finally {
        running = false;
      }
    };

    void heal(); // 起動時に一度(レガシーデータの修復)

    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.rooms === prev.rooms) return;
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => void heal(), 2000);
    });

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [setRoomSettings]);
}
