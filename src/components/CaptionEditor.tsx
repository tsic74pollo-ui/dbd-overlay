import { Captions } from "lucide-react";
import type { CaptionWidget } from "@/lib/types";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField } from "@/components/ui/Field";

type Props = {
  value: CaptionWidget;
  onChange: (next: CaptionWidget) => void;
};

/** 画面下キャプション(LocalVocal 音声翻訳字幕)ウィジェット設定。
 *  位置/サイズ/色/JA-EN 表示切替/継続秒数 等を編集する。 */
export function CaptionEditor({ value, onChange }: Props) {
  const set = (p: Partial<CaptionWidget>) => onChange({ ...value, ...p });

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold flex items-center gap-2">
          <Captions className="w-4 h-4 text-fuchsia-300" />
          キャプション字幕(画面下)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch
            checked={value.enabled}
            onCheckedChange={(v) => set({ enabled: v })}
          />
        </div>
      </div>

      {value.enabled && (
        <>
          <p className="text-xs text-gray-400 leading-snug">
            LocalVocal で受信した字幕(日本語+英訳)を表示します。
            上の「LocalVocal 連携」 を有効化していないと字幕は流れません。
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 bg-gray-750 rounded">
              <Label className="text-white text-xs">JA 表示</Label>
              <Switch
                checked={value.showJa}
                onCheckedChange={(v) => set({ showJa: v })}
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-750 rounded">
              <Label className="text-white text-xs">EN 表示</Label>
              <Switch
                checked={value.showEn}
                onCheckedChange={(v) => set({ showEn: v })}
              />
            </div>
          </div>

          <ColorField
            label="日本語の色"
            value={value.jaColor}
            onChange={(v) => set({ jaColor: v })}
          />
          <ColorField
            label="英語の色"
            value={value.enColor}
            onChange={(v) => set({ enColor: v })}
          />
          <ColorField
            label="背景色"
            value={value.bgColor}
            onChange={(v) => set({ bgColor: v })}
          />
          <RangeField
            label="背景透過"
            value={value.bgOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => set({ bgOpacity: v })}
            displayScale={100}
            unit="%"
          />
          <RangeField
            label="フォントサイズ"
            value={value.fontScale}
            min={0.5}
            max={2.5}
            step={0.05}
            onChange={(v) => set({ fontScale: v })}
            format={(v) => v.toFixed(2)}
          />
          <RangeField
            label="表示時間(秒)"
            value={value.durationMs / 1000}
            min={2}
            max={20}
            step={0.5}
            onChange={(v) => set({ durationMs: Math.round(v * 1000) })}
            format={(v) => `${v.toFixed(1)} 秒`}
          />
          <RangeField
            label="最大表示行数"
            value={value.maxVisibleLines}
            min={1}
            max={5}
            step={1}
            onChange={(v) => set({ maxVisibleLines: Math.round(v) })}
            format={(v) => `${Math.round(v)} 行`}
          />
          <RangeField
            label="位置 X"
            value={value.x}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => set({ x: v })}
            axis="x"
            unit="%"
          />
          <RangeField
            label="位置 Y"
            value={value.y}
            min={0}
            max={100}
            step={0.5}
            onChange={(v) => set({ y: v })}
            axis="y"
            unit="%"
          />
          <RangeField
            label="横幅"
            value={value.width}
            min={20}
            max={100}
            step={0.5}
            onChange={(v) => set({ width: v })}
            unit="%"
          />
        </>
      )}
    </div>
  );
}
