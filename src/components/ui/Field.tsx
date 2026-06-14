import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

type Axis = "x" | "y";

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  /** "x" → 左右矢印、"y" → 上下矢印を表示してどちらに動くか明示 */
  axis?: Axis;
  /** 数値入力に表示するときの単位（例: "%", "s"） */
  unit?: string;
  /** 表示時の倍率（例: 0..1 の opacity を 100倍して % 表示するなら 100） */
  displayScale?: number;
  /** ± ボタン1回分の刻み（既定は step） */
  nudge?: number;
};

const round = (v: number, decimals: number) => {
  const m = 10 ** decimals;
  return Math.round(v * m) / m;
};

const decimalsFromStep = (step: number): number => {
  if (step >= 1) return 0;
  if (step >= 0.1) return 1;
  if (step >= 0.01) return 2;
  return 3;
};

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  axis,
  unit,
  displayScale = 1,
  nudge,
}: RangeFieldProps) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const decimals = decimalsFromStep(step);
  const nudgeStep = nudge ?? step;

  // 数値入力は内部値とは別に編集中の文字列を保持（途中入力を許可）
  const displayed = round(value * displayScale, decimals);
  const [draft, setDraft] = useState<string>(String(displayed));
  useEffect(() => {
    setDraft(String(round(value * displayScale, decimals)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, displayScale, step]);

  const commitDraft = () => {
    const v = parseFloat(draft);
    if (Number.isNaN(v)) {
      setDraft(String(round(value * displayScale, decimals)));
      return;
    }
    onChange(clamp(v / displayScale));
  };

  /**
   * Commit on every keystroke when the draft already parses to a valid number.
   * This makes the native ▲▼ spinner buttons (and arrow-key nudges) apply the
   * change instantly instead of waiting for blur/Enter. Empty / partially-typed
   * states like "" / "1." are tolerated — they stay as draft until the user
   * finishes typing.
   */
  const handleDraftChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "") return;
    const v = parseFloat(raw);
    if (Number.isNaN(v)) return;
    // Only push if the parsed value differs (avoid useEffect ping-pong).
    const next = clamp(v / displayScale);
    if (next !== value) onChange(next);
  };

  const inc = () => onChange(clamp(round(value + nudgeStep, decimals + 2)));
  const dec = () => onChange(clamp(round(value - nudgeStep, decimals + 2)));

  const ArrowStart = axis === "x" ? ArrowLeft : axis === "y" ? ArrowUp : null;
  const ArrowEnd = axis === "x" ? ArrowRight : axis === "y" ? ArrowDown : null;
  const startHint = axis === "x" ? "左" : axis === "y" ? "上" : "";
  const endHint = axis === "x" ? "右" : axis === "y" ? "下" : "";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-white text-sm flex-1">
          {label}
          {format ? `: ${format(value)}` : ""}
        </Label>
        <button
          type="button"
          onClick={dec}
          aria-label={`${label} 減らす`}
          title={axis ? `${startHint}へ` : `− ${nudgeStep}`}
          className="h-7 w-7 inline-flex items-center justify-center rounded border border-gray-600 bg-gray-700 text-gray-100 hover:border-gray-400 hover:bg-gray-600 active:bg-gray-500"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <input
            type="number"
            value={draft}
            min={min * displayScale}
            max={max * displayScale}
            step={step * displayScale}
            onChange={(e) => handleDraftChange(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-7 w-20 rounded border border-gray-600 bg-gray-700 px-2 pr-6 text-right text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 tabular-nums"
          />
          {unit && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">
              {unit}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={inc}
          aria-label={`${label} 増やす`}
          title={axis ? `${endHint}へ` : `+ ${nudgeStep}`}
          className="h-7 w-7 inline-flex items-center justify-center rounded border border-gray-600 bg-gray-700 text-gray-100 hover:border-gray-400 hover:bg-gray-600 active:bg-gray-500"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        {ArrowStart ? (
          <ArrowStart className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          className="flex-1 accent-orange-500"
        />
        {ArrowEnd ? (
          <ArrowEnd className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-white text-sm flex-1">{label}</Label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-8 rounded cursor-pointer"
      />
    </div>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-white text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
