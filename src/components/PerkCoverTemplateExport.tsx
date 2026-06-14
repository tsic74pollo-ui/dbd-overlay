import { useState } from "react";
import { Download } from "lucide-react";
import type { PerkCover } from "@/lib/types";
import { RESOLUTIONS, coverDims, downloadCoverTemplate } from "@/lib/coverTemplate";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ToggleRow } from "@/components/ui/Field";

type Props = {
  cover: PerkCover;
};

const SCALES = [1, 2, 3, 4];

// 現在のカバー設定にぴったり合う、ひし形ガイド付き透明PNGテンプレを書き出す。
export function PerkCoverTemplateExport({ cover }: Props) {
  const [resKey, setResKey] = useState("1080p");
  const [scale, setScale] = useState(3);
  const [showDiamond, setShowDiamond] = useState(true);
  const [showSafeArea, setShowSafeArea] = useState(true);
  const [shadeCorners, setShadeCorners] = useState(true);

  const res = RESOLUTIONS.find((r) => r.key === resKey) ?? RESOLUTIONS[0];
  const { innerW, innerH, boxW, boxH } = coverDims(cover, res.w, res.h);
  const outW = innerW * scale;
  const outH = innerH * scale;

  return (
    <div className="space-y-2 p-3 bg-gray-750 rounded">
      <Label className="text-white text-sm font-semibold">テンプレPNG書き出し</Label>
      <p className="text-xs text-gray-400">
        今のカバーサイズに合うひし形ガイド付き透明PNGを書き出します。画像作成の下敷きにどうぞ。
      </p>

      <div className="flex items-center gap-2">
        <Label className="text-white text-sm flex-1">解像度（OBSソース）</Label>
        <select
          value={resKey}
          onChange={(e) => setResKey(e.target.value)}
          className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
        >
          {RESOLUTIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-white text-sm flex-1">書き出し倍率</Label>
        <select
          value={scale}
          onChange={(e) => setScale(parseInt(e.target.value))}
          className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
        >
          {SCALES.map((s) => (
            <option key={s} value={s}>
              ×{s}
            </option>
          ))}
        </select>
      </div>

      <ToggleRow label="ひし形ガイド線（切れる境界）" checked={showDiamond} onChange={setShowDiamond} />
      <ToggleRow label="セーフエリア（内側・点線）" checked={showSafeArea} onChange={setShowSafeArea} />
      <ToggleRow label="角（切れる範囲）を薄く表示" checked={shadeCorners} onChange={setShadeCorners} />

      <p className="text-xs text-gray-300">
        画像領域: <span className="font-mono">{innerW}×{innerH}px</span>
        <span className="text-gray-500">（枠込み {boxW}×{boxH}px）</span>
        <br />
        書き出しサイズ: <span className="font-mono">{outW}×{outH}px</span>
      </p>

      <Button className="w-full" onClick={() => downloadCoverTemplate(cover, { resW: res.w, resH: res.h, scale, showDiamond, showSafeArea, shadeCorners })}>
        <Download className="w-4 h-4" />
        テンプレPNGを書き出す
      </Button>

      <p className="text-xs text-gray-400">
        この上に自作デザインを描き、収め方(fit)は <span className="font-mono">fill</span> 推奨。ガイド線は最終出力前に消してください（全トグルOFFでサイズだけの透明PNGになります）。
      </p>
    </div>
  );
}
