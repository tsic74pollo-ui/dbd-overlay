import type { OverlaySettings, SetsLine } from "@/lib/types";

/** 全レイアウトコンポーネントが受け取る共通 Props。
 *  共通のサブコンポーネント (PerkCoverView 等) は OverlayView 親側で描画するため、
 *  各レイアウトは「タイトル/SET 表示」 等のテキスト部分のみ担当する。 */
export type LayoutProps = {
  settings: OverlaySettings;
  /** SET 切替表示用の現在 index(auto モード時はローカル自動カウンタ、manual 時は store 由来)。
   *  親 (OverlayView) で計算済みのものを受け取る。 */
  setIndex: number;
  /** SET 切替時のフェードアウト演出フラグ(親で管理) */
  setFading: boolean;
  /** 現在描画対象の SetsLine(無い/visible 無しなら null) */
  setsLine: SetsLine | null;
  /** SetsLine が表示可能か(visible かつ sets 配列に要素あり) */
  setsVisible: boolean;
};
