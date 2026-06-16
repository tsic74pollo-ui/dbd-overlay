import { Languages } from "lucide-react";
import type { BilingualStyle } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

type Props = {
  value: BilingualStyle;
  onChange: (next: BilingualStyle) => void;
};

/** バイリンガル表示の共通スタイル(各 TextLine の第二テキストに適用される)。 */
export function BilingualStyleEditor({ value, onChange }: Props) {
  const set = (p: Partial<BilingualStyle>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <Label className="text-white font-semibold flex items-center gap-2">
        <Languages className="w-4 h-4 text-sky-300" />
        バイリンガル表示(第二テキストの共通スタイル)
      </Label>

      <p className="text-xs text-gray-400 leading-snug">
        各テキスト行の「第二テキスト」 欄に入力した文字列にこのスタイルが適用されます。
        翻訳の他、サブタイトル/キャッチコピー/解説文にも使えます。
        空欄の行は従来通り単行表示のままです。
      </p>

      <div className="space-y-1">
        <Label className="text-white text-sm">第二テキスト色</Label>
        <div className="flex items-center gap-2">
          <Input
            value={value.color}
            onChange={(e) => set({ color: e.target.value })}
            placeholder="rgba(255,255,255,0.62)"
            className="font-mono text-sm"
          />
        </div>
        <p className="text-xs text-gray-500">
          CSS 色値(hex / rgb / rgba / 名称)。既定: 半透明の白寄り灰色
        </p>
      </div>

      <div className="space-y-1">
        <Label className="text-white text-sm">
          サイズ倍率: {Math.round(value.scale * 100)}%
        </Label>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          value={value.scale}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) set({ scale: v });
          }}
          className="w-full"
        />
        <p className="text-xs text-gray-500">主テキストに対する相対サイズ(0.3 〜 1.0)</p>
      </div>

      <div className="space-y-1">
        <Label className="text-white text-sm">
          行間: {value.gapEm.toFixed(2)}em
        </Label>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={value.gapEm}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) set({ gapEm: v });
          }}
          className="w-full"
        />
      </div>
    </div>
  );
}
