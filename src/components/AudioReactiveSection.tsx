import { useEffect, useRef, useState } from "react";
import { Wand2, Mic } from "lucide-react";
import type { AudioReactiveConfig, PerkCoverGlow } from "@/lib/types";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { RangeField } from "@/components/ui/Field";
import { useAudioReactive } from "@/lib/useAudioReactive";
import { AudioMeter } from "@/components/AudioMeter";

type Props = {
  value: PerkCoverGlow;
  onChange: (patch: Partial<PerkCoverGlow>) => void;
};

const DEFAULT_AUDIO: AudioReactiveConfig = {
  threshold: 0.08,
  gain: 1.5,
  band: "all",
};

const BANDS: { value: AudioReactiveConfig["band"]; label: string }[] = [
  { value: "all", label: "全体" },
  { value: "bass", label: "低音" },
  { value: "treble", label: "高音" },
];

/**
 * UX 設計:
 *  1. ライブメーターを真っ先に置く(音声を許可した瞬間に動き出して安心感)
 *  2. 閾値スライダーとメーター上の閾値マーカーが連動
 *  3. 「自動調整」ボタンで3秒録音 → 通常音量基準で閾値/ゲイン推定
 *  4. ミニライブプレビューで「自分の声で枠が光る」を実体験
 *  5. デバイス選択 + 「権限を許可」明示ボタン
 */
export function AudioReactiveSection({ value, onChange }: Props) {
  const cfg = value.audio ?? DEFAULT_AUDIO;
  const { level, rawLevel, status, error, devices, refreshDevices } =
    useAudioReactive(cfg, { enabled: true, smoothingSec: value.speedSec });

  const setAudio = (patch: Partial<AudioReactiveConfig>) =>
    onChange({ audio: { ...cfg, ...patch } });

  // 初回マウント時に devices をロードしておく(label が空ならまだ権限未取得)
  useEffect(() => {
    refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 自動調整: 3秒間の rawLevel サンプルから閾値/ゲインを推定 ----
  const [calibrating, setCalibrating] = useState(false);
  const [calibLeft, setCalibLeft] = useState(0);
  const samplesRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const startCalibration = () => {
    if (status !== "live") return;
    samplesRef.current = [];
    setCalibrating(true);
    setCalibLeft(3);
    const tickStart = Date.now();
    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - tickStart) / 1000;
      setCalibLeft(Math.max(0, 3 - elapsed));
      if (elapsed >= 3) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        finishCalibration();
      }
    }, 100);
  };

  // rawLevel の変化を別 effect でサンプリング(calibrating 中だけ)
  useEffect(() => {
    if (!calibrating) return;
    samplesRef.current.push(rawLevel);
  }, [rawLevel, calibrating]);

  const finishCalibration = () => {
    setCalibrating(false);
    const samples = samplesRef.current.slice();
    samplesRef.current = [];
    if (samples.length === 0) return;
    samples.sort((a, b) => a - b);
    // 95パーセンタイル を「通常音量の上限」とする → ゲインで 0.6 程度に持っていく
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const targetPeak = 0.6;
    const safePeak = Math.max(p95, 0.01);
    const newGain = Math.max(0.3, Math.min(3, targetPeak / safePeak));
    // 閾値は中央値の少し上 → 常時ノイズで反応しないように
    const newThreshold = Math.max(0.02, Math.min(0.4, p50 * newGain * 1.1));
    setAudio({
      gain: Math.round(newGain * 100) / 100,
      threshold: Math.round(newThreshold * 100) / 100,
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-3 mt-2 p-3 bg-gray-900/50 border border-gray-700/60 rounded">
      <div className="flex items-center gap-2">
        <Mic className="w-4 h-4 text-orange-300" />
        <Label className="text-white text-sm font-semibold">
          オーディオ反応
        </Label>
      </div>

      {/* 入力ソース選択 */}
      <div className="flex items-center gap-2">
        <Label className="text-white text-sm flex-1">入力ソース</Label>
        <select
          value={cfg.deviceId ?? ""}
          onChange={(e) =>
            setAudio({ deviceId: e.target.value || undefined })
          }
          className="h-8 max-w-[14rem] rounded border border-gray-600 bg-gray-700 px-2 text-xs text-white focus:outline-none"
        >
          <option value="">マイク(規定)</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `マイク ${d.deviceId.slice(0, 6)}…`}
            </option>
          ))}
        </select>
      </div>

      {/* ライブメーター(常時表示。マイク許可後に動き出す) */}
      <AudioMeter
        level={level}
        raw={rawLevel}
        threshold={cfg.threshold}
        status={status}
        error={error}
      />

      {/* 閾値 + ゲイン */}
      <RangeField
        label="閾値"
        value={cfg.threshold}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => setAudio({ threshold: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
      <RangeField
        label="ゲイン"
        value={cfg.gain}
        min={0.1}
        max={3}
        step={0.05}
        onChange={(v) => setAudio({ gain: v })}
        format={(v) => `×${v.toFixed(2)}`}
      />

      {/* 周波数帯 */}
      <div className="flex items-center gap-3">
        <Label className="text-white text-sm flex-1">周波数帯</Label>
        <div className="flex gap-1">
          {BANDS.map((b) => (
            <button
              key={b.value}
              onClick={() => setAudio({ band: b.value })}
              className={`px-3 py-1 rounded border text-xs font-semibold transition-colors ${
                cfg.band === b.value
                  ? "bg-orange-500 border-orange-400 text-white"
                  : "bg-gray-700 border-gray-600 text-gray-200 hover:border-gray-400"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* 自動調整 */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={startCalibration}
        disabled={status !== "live" || calibrating}
        title="通常の話し声を3秒録って閾値・ゲインを自動設定"
      >
        <Wand2 className="w-3.5 h-3.5" />
        {calibrating
          ? `自動調整中… 話してください(${calibLeft.toFixed(1)}s)`
          : "3秒間の通常音量で自動調整"}
      </Button>

      {/* ミニライブプレビュー */}
      <div className="pt-1">
        <Label className="text-white text-xs text-gray-300 mb-1 block">
          プレビュー
        </Label>
        <div className="h-20 bg-gray-900 border border-gray-700 rounded flex items-center justify-center">
          <div
            style={
              {
                width: 56,
                height: 56,
                background: value.color,
                borderRadius: 8,
                boxShadow: `0 0 ${6 + 32 * level}px ${2 + 8 * level}px ${value.color}`,
                filter: `brightness(${(0.85 + 0.45 * level).toFixed(2)})`,
                transition: "box-shadow 60ms linear, filter 60ms linear",
              } as React.CSSProperties
            }
          />
        </div>
        <p className="text-[10px] text-gray-500 mt-1 leading-snug">
          ※ 本番では枠のグローとして同じ反応で表現されます。
        </p>
      </div>
    </div>
  );
}
