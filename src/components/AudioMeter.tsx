import { Mic, MicOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AudioStatus } from "@/lib/useAudioReactive";

type Props = {
  /** 反応度(threshold + gain適用後) — オレンジ */
  level: number;
  /** RMS生値(調整前) — グレー */
  raw: number;
  /** 闾値マーカー位置(0..1) */
  threshold: number;
  /** 接続/許可状態 */
  status: AudioStatus;
  error?: string;
};

/**
 * UX 設計:
 *  - 二段の重ねバー(灰 = raw, 橙 = active)で「今どれだけ反応しているか」を即座に伝える
 *  - 閾値マーカー(縦線)が灰と橙の境界として表示される
 *  - 閾値スライダーを動かすとマーカーが連動 → 関係が視覚化
 *  - 状態を文字 + アイコンで明示。「許可してください」「マイクが見つかりません」のヒントも出す
 */
export function AudioMeter({ level, raw, threshold, status, error }: Props) {
  const labelByStatus: Record<AudioStatus, string> = {
    idle: "未接続",
    requesting: "マイク権限を要求中…",
    live: `${Math.round(raw * 100)}%`,
    denied: "マイク拒否。ブラウザ設定から許可してください",
    error: "エラー",
  };

  const Icon =
    status === "live"
      ? Mic
      : status === "denied" || status === "error"
        ? AlertCircle
        : MicOff;

  const iconCls =
    status === "live"
      ? "text-emerald-300"
      : status === "denied" || status === "error"
        ? "text-red-300"
        : "text-zinc-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        <Icon className={cn("w-3.5 h-3.5", iconCls)} />
        <span className={cn("font-mono", iconCls)}>
          {labelByStatus[status]}
        </span>
        {error && status === "error" && (
          <span className="ml-auto text-[10px] text-red-300/80 font-mono truncate max-w-[12rem]">
            {error}
          </span>
        )}
      </div>

      {/* 二段バー: グレー(raw) の上にオレンジ(active) が重なる */}
      <div className="relative h-4 bg-gray-900 border border-gray-700 rounded overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gray-500/80"
          style={{ width: `${Math.min(1, raw) * 100}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-300"
          style={{ width: `${Math.min(1, level) * 100}%`, transition: "width 60ms linear" }}
        />
        {/* 閾値マーカー */}
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-200"
          style={{ left: `${threshold * 100}%` }}
          title={`閾値 ${Math.round(threshold * 100)}%`}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-500 font-mono">
        <span>静</span>
        <span>↑ {Math.round(threshold * 100)}% から反応</span>
        <span>強</span>
      </div>
    </div>
  );
}
