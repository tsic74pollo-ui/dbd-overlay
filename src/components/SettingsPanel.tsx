import { useAppStore, selectActiveRoom } from "@/store/appStore";
import {
  LINE_LABELS,
  normalizeBilingualStyle,
  normalizeMatchTimer,
  normalizePerkCover,
  normalizeSessionTimer,
} from "@/lib/defaults";
import type {
  Align,
  BilingualStyle,
  Line,
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
import { ObsConnectionPanel } from "@/components/ObsConnectionPanel";
import { RoomActivationEditor } from "@/components/RoomActivationEditor";
import { RemoteUrlPanel } from "@/components/RemoteUrlPanel";
import { HotkeySettings } from "@/components/HotkeySettings";

export function SettingsPanel() {
  const room = useAppStore(selectActiveRoom);
  const update = useAppStore((s) => s.updateActiveRoomSettings);

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

  const patchLine = (idx: number, patch: Partial<Line>) => {
    update((s) => ({
      ...s,
      lines: s.lines.map((l, i) => (i === idx ? ({ ...l, ...patch } as Line) : l)),
    }));
  };

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-lg max-h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-xl font-bold text-white">オーバーレイ設定</h2>

      <AlignSelector value={settings.align ?? "left"} onChange={setAlign} />

      <RemoteUrlPanel />

      <HotkeySettings />

      <ObsConnectionPanel />

      <RoomActivationEditor />

      <MatchControls />

      <PerkCoverEditor value={normalizePerkCover(settings.perkCover)} onChange={setPerkCover} />

      <MatchTimerEditor value={normalizeMatchTimer(settings.matchTimer)} onChange={setMatchTimer} />

      <SessionTimerEditor value={normalizeSessionTimer(settings.sessionTimer)} onChange={setSessionTimer} />

      <BilingualStyleEditor value={normalizeBilingualStyle(settings.bilingualStyle)} onChange={setBilingualStyle} />

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
    </div>
  );
}
