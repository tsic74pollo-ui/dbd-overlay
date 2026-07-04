import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import {
  LINE_LABELS,
  normalizeBilingualStyle,
  normalizeLottie,
  normalizeMatchLog,
  normalizeMatchTimer,
  normalizePerkCover,
  normalizeSessionTimer,
} from "@/lib/defaults";
import type {
  Align,
  BilingualStyle,
  Line,
  LottieAnimation,
  MatchLogWidget,
  MatchTimer,
  PerkCover,
  SessionTimer,
  SetsLine,
  TextLine,
} from "@/lib/types";
import { isSetsLine } from "@/lib/types";
import { IconPicker } from "@/components/IconPicker";
import { LineEditor } from "@/components/LineEditor";
import { SetsEditor } from "@/components/SetsEditor";
import { AlignSelector } from "@/components/AlignSelector";
import { MatchControls } from "@/components/MatchControls";
import { PerkCoverEditor } from "@/components/PerkCoverEditor";
import { MatchTimerEditor } from "@/components/MatchTimerEditor";
import { SessionTimerEditor } from "@/components/SessionTimerEditor";
import { BilingualStyleEditor } from "@/components/BilingualStyleEditor";
import { MatchLogEditor } from "@/components/MatchLogEditor";
import { LottieEditor } from "@/components/LottieEditor";
import { ObsConnectionPanel } from "@/components/ObsConnectionPanel";
import { RoomActivationEditor } from "@/components/RoomActivationEditor";
import { RemoteUrlPanel } from "@/components/RemoteUrlPanel";
import { HotkeySettings } from "@/components/HotkeySettings";

export function SettingsPanel() {
  const room = useAppStore(selectActiveRoom);
  const update = useAppStore((s) => s.updateActiveRoomSettings);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (!room) return null;

  const { settings } = room;

  const setIcon = (image: string) => {
    update((s) => ({ ...s, iconImage: image }));
  };

  const setAlign = (align: Align) => {
    update((s) => ({ ...s, align }));
  };

  const setPerkCover = (next: PerkCover) => {
    update((s) => ({ ...s, perkCover: next }));
  };

  const setMatchTimer = (next: MatchTimer) => {
    update((s) => ({ ...s, matchTimer: next }));
  };

  const setSessionTimer = (next: SessionTimer) => {
    update((s) => ({ ...s, sessionTimer: next }));
  };

  const setBilingualStyle = (next: BilingualStyle) => {
    update((s) => ({ ...s, bilingualStyle: next }));
  };

  const setMatchLog = (next: MatchLogWidget) => {
    update((s) => ({ ...s, matchLog: next }));
  };

  const setLottie = (next: LottieAnimation) => {
    update((s) => ({ ...s, lottie: next }));
  };

  const patchLine = (idx: number, patch: Partial<Line>) => {
    update((s) => ({
      ...s,
      lines: s.lines.map((l, i) => (i === idx ? ({ ...l, ...patch } as Line) : l)),
    }));
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg max-h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-xl font-bold text-white">オーバーレイ設定</h2>

      {/* ===== コア（ほとんどの人が使う基本機能） ===== */}
      <AlignSelector value={settings.align ?? "left"} onChange={setAlign} />

      <MatchControls />

      <PerkCoverEditor value={normalizePerkCover(settings.perkCover)} onChange={setPerkCover} />

      <MatchTimerEditor value={normalizeMatchTimer(settings.matchTimer)} onChange={setMatchTimer} />

      <SessionTimerEditor value={normalizeSessionTimer(settings.sessionTimer)} onChange={setSessionTimer} />

      <MatchLogEditor value={normalizeMatchLog(settings.matchLog)} onChange={setMatchLog} />

      <IconPicker iconImage={settings.iconImage} onChange={setIcon} />

      <div className="space-y-4">
        {settings.lines.map((line, idx) =>
          isSetsLine(line) ? (
            <SetsEditor
              key={idx}
              label={LINE_LABELS[idx]}
              line={line as SetsLine}
              onChange={(p) => patchLine(idx, p)}
            />
          ) : (
            <LineEditor
              key={idx}
              label={LINE_LABELS[idx]}
              line={line as TextLine}
              onChange={(p) => patchLine(idx, p)}
            />
          ),
        )}
      </div>

      {/* ===== 詳細設定（上級者向け・既定は折りたたみ） ===== */}
      <div className="border-t border-gray-800 pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-gray-300">詳細設定（上級者向け）</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-gray-400 transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </button>
        <p className="mt-1 text-xs text-gray-500">
          OBS連携・リモコン・ホットキー・Lottie演出・バイリンガル。使う人だけ開いてください。
        </p>
        {advancedOpen && (
          <div className="mt-4 space-y-6">
            <ObsConnectionPanel />
            <RoomActivationEditor />
            <RemoteUrlPanel />
            <HotkeySettings />
            <BilingualStyleEditor
              value={normalizeBilingualStyle(settings.bilingualStyle)}
              onChange={setBilingualStyle}
            />
            <LottieEditor value={normalizeLottie(settings.lottie)} onChange={setLottie} />
          </div>
        )}
      </div>
    </div>
  );
}
