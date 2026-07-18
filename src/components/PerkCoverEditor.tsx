import { useState } from "react";
import { Upload, Play, Pause, RotateCcw, Save } from "lucide-react";
import type {
  CountdownPos,
  PerkCover,
  PerkCoverFit,
  PerkCoverGlow,
  PerkCoverGlowStyle,
  PerkCoverReveal,
  PerkCoverShape,
  PerkCoverTimer,
} from "@/lib/types";
import { PERK_COVER_PRESETS, saveUserDefaultPerkCoverRect } from "@/lib/defaults";
import { readImageFileScaled } from "@/lib/imageFile";
import { startSw, stopSw, resetSw } from "@/lib/timer";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField, ToggleRow } from "@/components/ui/Field";
import { PerkCoverTemplateExport } from "@/components/PerkCoverTemplateExport";

type Props = {
  value: PerkCover;
  onChange: (next: PerkCover) => void;
};

const FITS: { value: PerkCoverFit; label: string }[] = [
  { value: "contain", label: "contain（全体）" },
  { value: "cover", label: "cover（埋める）" },
  { value: "fill", label: "fill（伸縮）" },
];

const SHAPES: { value: PerkCoverShape; label: string }[] = [
  { value: "diamond", label: "ひし形（既定）" },
  { value: "roundedSquare", label: "角丸四角" },
];

const REVEALS: { value: PerkCoverReveal; label: string }[] = [
  { value: "fade", label: "フェード" },
  { value: "slideDown", label: "下に滑り落ちる" },
];

const GLOW_STYLES: { value: PerkCoverGlowStyle; label: string; hint: string }[] = [
  { value: "solid", label: "単色", hint: "静かに光るだけ" },
  { value: "neon", label: "ネオン明滅", hint: "リズム良く点滅" },
  { value: "rainbow", label: "流れる虹色", hint: "7色 conic 回転" },
  { value: "heartbeat", label: "心音(Terror Radius)", hint: "二拍子の鼓動。発見/接近の緊張感" },
];

const COUNTDOWN_POSITIONS: { value: CountdownPos; label: string }[] = [
  { value: "top", label: "上" },
  { value: "topLeft", label: "左上" },
  { value: "left", label: "左横" },
  { value: "bottomLeft", label: "左下" },
];

export function PerkCoverEditor({ value, onChange }: Props) {
  const set = (p: Partial<PerkCover>) => onChange({ ...value, ...p });
  const setGlow = (p: Partial<PerkCoverGlow>) => onChange({ ...value, glow: { ...value.glow, ...p } });
  const setTimer = (p: Partial<PerkCoverTimer>) => onChange({ ...value, timer: { ...value.timer, ...p } });

  const [savedFlash, setSavedFlash] = useState(false);
  const handleSaveAsDefault = () => {
    saveUserDefaultPerkCoverRect({
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
    });
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const [imgNote, setImgNote] = useState<string | null>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = await readImageFileScaled(file);
    if (r.ok) {
      set({ image: r.dataUrl });
      setImgNote(r.scaled ? "配信同期のため画像を自動縮小しました" : null);
    } else {
      setImgNote(r.error);
    }
  };

  const min = Math.floor(value.timer.durationSec / 60);
  const sec = value.timer.durationSec % 60;
  const setDuration = (m: number, s: number) =>
    setTimer({ durationSec: Math.max(0, (m || 0) * 60 + (s || 0)) });

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold">パーク隠しカバー（右下）</Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch
            checked={value.enabled}
            onCheckedChange={(v) =>
              // ON 切替時はタイマーの経過状態を必ずリセット。
              // 前回完走した残骸 (accumulatedMs ≥ durationSec*1000) が残っていると
              // released 判定が成立してカバーが透明になる、を防ぐ。
              onChange(
                v
                  ? {
                      ...value,
                      enabled: true,
                      timer: { ...value.timer, running: false, startedAt: null, accumulatedMs: 0 },
                    }
                  : { ...value, enabled: false },
              )
            }
          />
        </div>
      </div>

      {value.enabled && (
        <>
          {/* 画像 / ロゴ */}
          <input type="file" id="perk-cover-upload" accept="image/*" onChange={handleUpload} className="hidden" />
          <label
            htmlFor="perk-cover-upload"
            className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded border border-gray-600 px-4 text-sm font-medium text-gray-100 transition-colors hover:border-gray-400 hover:bg-gray-800"
          >
            <Upload className="w-4 h-4" />
            画像・ロゴをアップロード
          </label>
          {imgNote && <p className="text-xs text-amber-300">{imgNote}</p>}
          {value.image && (
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2 border border-gray-600 rounded">
                <img src={value.image} alt="cover" className="w-full h-16 object-contain" />
              </div>
              <Button variant="outline" size="sm" onClick={() => set({ image: null })}>
                クリア
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label className="text-white text-sm flex-1">画像の収め方</Label>
            <select
              value={value.fit}
              onChange={(e) => set({ fit: e.target.value as PerkCoverFit })}
              className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
            >
              {FITS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* 形状 */}
          <div className="flex items-center gap-2">
            <Label className="text-white text-sm flex-1">カバーの形</Label>
            <select
              value={value.shape ?? "diamond"}
              onChange={(e) => set({ shape: e.target.value as PerkCoverShape })}
              className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
            >
              {SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* 背景・不透明度 */}
          <ColorField label="背景色" value={value.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
          <RangeField
            label="不透明度"
            value={value.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set({ opacity: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            displayScale={100}
            unit="%"
          />
          <p className="text-xs text-gray-400">※ 100% で下のパークが完全に隠れます。</p>

          {/* プリセット（解像度 / HUDスケール） */}
          <div className="space-y-2">
            <Label className="text-white text-sm">プリセット（解像度 / HUDスケール）</Label>
            <div className="flex gap-2">
              {PERK_COVER_PRESETS.map((p) => (
                <Button key={p.key} variant="outline" size="sm" className="flex-1" onClick={() => set({ ...p.rect })}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 位置・サイズ（軸矢印つき・数値入力対応） */}
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
          <RangeField
            label="幅 W"
            value={value.width}
            min={3}
            max={60}
            step={0.5}
            onChange={(v) => set({ width: v })}
            unit="%"
            nudge={0.1}
          />
          <RangeField
            label="高さ H"
            value={value.height}
            min={3}
            max={60}
            step={0.5}
            onChange={(v) => set({ height: v })}
            unit="%"
            nudge={0.1}
          />

          {/* 現在の位置・サイズをデフォルト化 */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleSaveAsDefault}
              title="今の位置 X / Y / 幅 W / 高さ H を新規ルーム作成時のデフォルトとして保存"
            >
              <Save className="w-3.5 h-3.5" />
              {savedFlash ? "✓ デフォルトに保存しました" : "現在の位置・サイズをデフォルトに保存"}
            </Button>
          </div>

          {/* 光る枠 */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <ToggleRow
              label="枠を光らせる"
              checked={value.glow.enabled}
              onChange={(v) => setGlow({ enabled: v })}
            />
            {value.glow.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-white text-sm flex-1">スタイル</Label>
                  <select
                    value={value.glow.style}
                    onChange={(e) =>
                      setGlow({ style: e.target.value as PerkCoverGlowStyle })
                    }
                    className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
                  >
                    {GLOW_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-400 -mt-1">
                  ※ {GLOW_STYLES.find((s) => s.value === value.glow.style)?.hint}
                </p>

                <ToggleRow
                  label="残時間で色変化（灰→黄→赤）"
                  checked={value.glow.colorByTimer}
                  onChange={(v) => setGlow({ colorByTimer: v })}
                />
                <ColorField
                  label="グロー色"
                  value={value.glow.color}
                  onChange={(v) => setGlow({ color: v })}
                />

                {value.glow.style !== "solid" && (
                  <RangeField
                    label="速さ(秒)"
                    value={value.glow.speedSec}
                    min={0.6}
                    max={8}
                    step={0.1}
                    onChange={(v) => setGlow({ speedSec: v })}
                    format={(v) => v.toFixed(2)}
                  />
                )}
              </>
            )}
          </div>

          {/* 開放アニメーション */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <div className="flex items-center gap-2">
              <Label className="text-white text-sm flex-1">開放時の演出</Label>
              <select
                value={value.reveal ?? "fade"}
                onChange={(e) => set({ reveal: e.target.value as PerkCoverReveal })}
                className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
              >
                {REVEALS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <RangeField
              label="演出の長さ"
              value={value.revealDurationMs ?? 600}
              min={200}
              max={3000}
              step={50}
              onChange={(v) => set({ revealDurationMs: v })}
              unit="ms"
              nudge={50}
            />
          </div>

          {/* 開放タイマー */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <ToggleRow
              label="開放タイマー（カウントダウン）"
              checked={value.timer.enabled}
              onChange={(v) =>
                setTimer(
                  v
                    ? // ON 切替 → カウントダウンを必ず未スタート状態から始められるよう経過状態をリセット。
                      // これがないと前回完走した状態(accumulatedMs ≥ durationSec*1000)のまま
                      // released 判定が成立してカバーが透明になる(意図しない非表示)。
                      { enabled: true, running: false, startedAt: null, accumulatedMs: 0 }
                    : { enabled: false },
                )
              }
            />
            {value.timer.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-white text-sm flex-1">制限時間</Label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={min}
                    onChange={(e) => setDuration(parseInt(e.target.value), sec)}
                    className="w-16 h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
                  />
                  <span className="text-gray-300 text-sm">分</span>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={sec}
                    onChange={(e) => setDuration(min, parseInt(e.target.value))}
                    className="w-16 h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
                  />
                  <span className="text-gray-300 text-sm">秒</span>
                </div>
                <ToggleRow
                  label="数字で残り時間を表示"
                  checked={value.timer.showCountdown}
                  onChange={(v) => setTimer({ showCountdown: v })}
                />
                <p className="text-xs text-gray-400 -mt-1">
                  ※ OFF にすると数字は出ず、カバーの色変化（灰→黄→赤）だけで残時間を伝えます。
                </p>
                {value.timer.showCountdown && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label className="text-white text-sm flex-1">タイマー位置（カバー基準）</Label>
                      <select
                        value={value.timer.countdownPos}
                        onChange={(e) => setTimer({ countdownPos: e.target.value as CountdownPos })}
                        className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none"
                      >
                        {COUNTDOWN_POSITIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <ColorField label="文字色" value={value.timer.countdownColor} onChange={(v) => setTimer({ countdownColor: v })} />
                    <ToggleRow
                      label="残り少なくなったら点滅"
                      checked={value.timer.urgentPulse ?? true}
                      onChange={(v) => setTimer({ urgentPulse: v })}
                    />
                    {(value.timer.urgentPulse ?? true) && (
                      <RangeField
                        label="点滅し始める残り時間"
                        value={value.timer.urgentBelowSec ?? 10}
                        min={3}
                        max={60}
                        step={1}
                        onChange={(v) => setTimer({ urgentBelowSec: v })}
                        unit="s"
                        nudge={1}
                      />
                    )}
                  </>
                )}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setTimer(startSw(value.timer))}>
                    <Play className="w-3.5 h-3.5" />
                    開始
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setTimer(stopSw(value.timer))}>
                    <Pause className="w-3.5 h-3.5" />
                    停止
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setTimer(resetSw(value.timer))}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    リセット
                  </Button>
                </div>
                <p className="text-xs text-gray-400">0 になると選択した演出でカバーが消えて開放されます。</p>
              </>
            )}
          </div>

          {/* テンプレPNG書き出し */}
          <PerkCoverTemplateExport cover={value} />
        </>
      )}
    </div>
  );
}
