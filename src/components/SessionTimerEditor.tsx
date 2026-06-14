import { useState } from "react";
import { Play, RotateCcw, Save } from "lucide-react";
import type { SessionTimer } from "@/lib/types";
import { startSw, resetSw } from "@/lib/timer";
import { saveUserDefaultSessionTimerPos } from "@/lib/defaults";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField } from "@/components/ui/Field";

type Props = {
  value: SessionTimer;
  onChange: (next: SessionTimer) => void;
};

/** 通しタイマー(OBS録画通し時間記録用)。マッチタイマーと違い、Live/録画終了まで
 *  リセットしない。映像と照らし合わせて各マッチ開始時刻を逆引きするのが用途。 */
export function SessionTimerEditor({ value, onChange }: Props) {
  const set = (p: Partial<SessionTimer>) => onChange({ ...value, ...p });

  const [savedFlash, setSavedFlash] = useState(false);
  const handleSaveAsDefault = () => {
    saveUserDefaultSessionTimerPos({ x: value.x, y: value.y });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold">
          通しタイマー（OBS録画通し時間 / カウントアップ）
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      {value.enabled && (
        <>
          <p className="text-xs text-gray-400 leading-snug">
            Live・録画の開始から終了まで通して回しっぱなしのタイマーです。
            マッチごとにリセットされないので、後で映像と突き合わせて各マッチ開始時刻を
            ピンポイントで参照する用途に使えます。
          </p>

          <div className="flex items-center gap-2">
            <Label className="text-white text-sm flex-1">ラベル</Label>
            <Input
              value={value.label}
              onChange={(e) => set({ label: e.target.value })}
              placeholder="REC"
              className="flex-1"
            />
          </div>
          <ColorField label="文字色" value={value.color} onChange={(v) => set({ color: v })} />
          <RangeField
            label="サイズ"
            value={value.fontScale}
            min={0.5}
            max={2.0}
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
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onChange(startSw(value))}
              disabled={value.running}
              title="通しタイマーを開始(ホットキー R と同等)"
            >
              <Play className="w-3.5 h-3.5" />
              開始
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onChange(resetSw(value))}
              title="0 にリセット(停止＋クリア)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              リセット
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
