import type { LayoutId } from "@/lib/types";
import { OverlayLayoutClassic } from "./OverlayLayoutClassic";
import { OverlayLayoutFloatingPill } from "./OverlayLayoutFloatingPill";
import { OverlayLayoutEsportsScore } from "./OverlayLayoutEsportsScore";
import { OverlayLayoutLowerThird } from "./OverlayLayoutLowerThird";
import type { LayoutProps } from "./parts/types";

/** レイアウトテンプレートのレジストリ。
 *  新規追加時はここに 1 行 + LayoutId 型に文字列を 1 つ追加するだけ。 */
export const LAYOUTS: Record<
  LayoutId,
  {
    label: string;
    description: string;
    Component: React.FC<LayoutProps>;
  }
> = {
  classic: {
    label: "Classic",
    description: "従来の縦積み・左上集中・背景ブロック式",
    Component: OverlayLayoutClassic,
  },
  "floating-pill": {
    label: "Floating Pill",
    description: "角丸ピル + ぼかし、個人配信のミニマル",
    Component: OverlayLayoutFloatingPill,
  },
  "esports-score": {
    label: "Esports Score Bar",
    description: "公式大会風 5 セルスコアバー(自動スコア集計)",
    Component: OverlayLayoutEsportsScore,
  },
  "lower-third": {
    label: "Lower Third",
    description: "画面下 1/3、TV 報道テロップ風(スライドイン)",
    Component: OverlayLayoutLowerThird,
  },
};

/** Type-safe な ID 一覧 */
export const LAYOUT_IDS: LayoutId[] = [
  "classic",
  "floating-pill",
  "esports-score",
  "lower-third",
];
