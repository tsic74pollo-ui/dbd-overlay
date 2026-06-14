import { Play, Pause, RotateCcw } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { defaultMatchTimer, defaultPerkCover } from "@/lib/defaults";
import { startSw, stopSw, resetSw } from "@/lib/timer";
import type { OverlaySettings, StopwatchState } from "@/lib/types";
import { Button } from "@/components/ui/Button";

// マッチタイマーとパーク開放タイマーを同時に操作するマスターコントロール
export function MatchControls() {
  const update = useAppStore((s) => s.updateActiveRoomSettings);

  const apply = (fn: <T extends StopwatchState>(s: T) => T) => {
    update((s: OverlaySettings) => {
      const perkCover = s.perkCover ?? defaultPerkCover();
      const matchTimer = s.matchTimer ?? defaultMatchTimer();
      return {
        ...s,
        perkCover: { ...perkCover, timer: fn(perkCover.timer) },
        matchTimer: fn(matchTimer),
      };
    });
  };

  return (
    <div className="space-y-2 p-4 bg-gray-800 rounded">
      <h3 className="text-white font-semibold text-sm">試合コントロール</h3>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => apply(startSw)}>
          <Play className="w-4 h-4" />
          試合開始
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => apply(stopSw)}>
          <Pause className="w-4 h-4" />
          停止
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => apply(resetSw)}>
          <RotateCcw className="w-4 h-4" />
          リセット
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        マッチタイマー（カウントアップ）とパーク開放タイマー（カウントダウン）を同時に開始/停止/リセットします。
      </p>
    </div>
  );
}
