import type { LayoutId } from "@/lib/types";
import { OverlayLayoutClassic } from "./OverlayLayoutClassic";
import { OverlayLayoutFloatingPill } from "./OverlayLayoutFloatingPill";
import { OverlayLayoutEsportsScore } from "./OverlayLayoutEsportsScore";
import { OverlayLayoutLowerThird } from "./OverlayLayoutLowerThird";
import {
  OverlayLayoutBadgeDock,
  OverlayLayoutCornerframe,
  OverlayLayoutLedger,
  OverlayLayoutMatrix,
  OverlayLayoutRelay,
  OverlayLayoutTabdeck,
} from "./OverlayLayoutsLeftTop";
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
  cornerframe: {
    label: "Cornerframe",
    description: "L字フレームで背景をほぼ隠さない左上レイアウト",
    Component: OverlayLayoutCornerframe,
  },
  relay: {
    label: "Relay",
    description: "縦レールで試合情報を接続する競技配信レイアウト",
    Component: OverlayLayoutRelay,
  },
  tabdeck: {
    label: "Tabdeck",
    description: "Classicの縦積みを段差カードへ刷新したレイアウト",
    Component: OverlayLayoutTabdeck,
  },
  ledger: {
    label: "Ledger",
    description: "高コントラストな大会冊子・編集デザイン",
    Component: OverlayLayoutLedger,
  },
  matrix: {
    label: "Matrix",
    description: "高さを抑えた2列の大会・スクリム向け情報グリッド",
    Component: OverlayLayoutMatrix,
  },
  "badge-dock": {
    label: "Badge Dock",
    description: "アップロードしたチームロゴを大きく見せる左ドック",
    Component: OverlayLayoutBadgeDock,
  },
};

/** Type-safe な ID 一覧 */
export const LAYOUT_IDS: LayoutId[] = [
  "classic",
  "floating-pill",
  "esports-score",
  "lower-third",
  "cornerframe",
  "relay",
  "tabdeck",
  "ledger",
  "matrix",
  "badge-dock",
];
