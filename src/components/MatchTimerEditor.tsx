import { useState } from "react";
import { Play, Pause, RotateCcw, Save } from "lucide-react";
import type { MatchTimer } from "@/lib/types";
import { startSw, stopSw, resetSw } from "@/lib/timer";
import { saveUserDefaultMatchTimerPos } from "@/lib/defaults";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField } from "@/components/ui/Field";

type Props = {
  value: MatchTimer;
  onChange: (next: MatchTimer) => void;
};

export function MatchTimerEditor({ value, onChange }: Props) {
  const set = (p: Partial<MatchTimer>) => onChange({ ...value, ...p });

  const [savedFlash, setSavedFlash] = useState(false);
  const handleSaveAsDefault = () => {
    saveUserDefaultMatchTimerPos({ x: value.x, y: value.y });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold">マッチタイマー（左下・カウントアップ）</Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      {value.enabled && (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-white text-sm flex-1">ラベル</Label>
            <Input
              value={value.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="MATCH TIME"
              className="flex-1"
            />
          </div>
          <ColorField label="文字色" value={value.color} onChange={(v) => set({ color: v })} />
          <RangeField
            label="サイズ"
            value={value.fontScale}
            min={0.6}
            max={2.4}
            step={0.05}
            onChange={(v) => set({ fontScale: v })}
            format={(v) => v.toFixed(2)}
            nudge={0.05}
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
            nudge={0.1}
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
            nudge={0.1}
          />

          {/* 現在の位置をデフォルト化 */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleSaveAsDefault}
              title="今の位置 X / Y を新規ルーム作成時のデフォルトとして保存"
            >
              <Save className="w-3.5 h-3.5" />
              {savedFlash ? "✓ デフォルトに保存しました" : "現在の位置をデフォルトに保存"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => onChange(startSw(value))}>
              <Play className="w-3.5 h-3.5" />
              開始
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onChange(stopSw(value))}>
              <Pause className="w-3.5 h-3.5" />
              停止
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onChange(resetSw(value))}>
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
