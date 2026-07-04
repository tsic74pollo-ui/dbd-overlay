import { useState } from "react";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { SettingsPanel } from "@/components/SettingsPanel";
import { OverlayView } from "@/components/OverlayView";
import { RoomBar } from "@/components/RoomBar";
import { useRoomsSync } from "@/lib/useRoomsSync";
import { useAutoBackup } from "@/lib/useAutoBackup";
import { Move } from "lucide-react";
import {
  normalizePerkCover,
  normalizeMatchTimer,
  normalizeSessionTimer,
  normalizeMatchLog,
} from "@/lib/defaults";
import { useHotkeys } from "@/lib/useHotkeys";
import { HotkeyToast } from "@/components/HotkeyToast";
import { useRemoteCommandHost } from "@/lib/useRemoteCommandHost";
import { useEffectiveHotkeys } from "@/lib/useEffectiveHotkeys";
import { ObsConnectionProvider } from "@/lib/obsConnectionContext";
import { useCallback } from "react";

export function EditorPage() {
  return (
    <ObsConnectionProvider>
      <EditorPageInner />
    </ObsConnectionProvider>
  );
}

function EditorPageInner() {
  const room = useAppStore(selectActiveRoom);
  const updateSettings = useAppStore((s) => s.updateActiveRoomSettings);
  const [previewBg, setPreviewBg] = useState<"checker" | "dbd" | "transparent">("checker");
  const [dragEnabled, setDragEnabled] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // ---- Hotkeys (T = timer, B = box/cover, N = next room) -------------------
  // HOTKEY_ACTIONS が単一情報源。リモコン/Claude AI からも同じ id で発火できる。
  const showToast = useCallback((label: string) => {
    // 連打した時のために空文字を一旦挟んでから新メッセージで再トリガー
    setToast(null);
    window.setTimeout(() => setToast(label), 0);
  }, []);

  // localStorage の上書きを反映した実効ホットキーで購読
  const { effective } = useEffectiveHotkeys();
  useHotkeys(
    effective.map((a) => ({
      key: a.key,
      mods: a.mods,
      action: () => {
        a.perform(useAppStore.getState());
        showToast(a.shortLabel);
      },
    })),
  );

  // リモコンページからの command を受信
  useRemoteCommandHost(showToast);

  // エディタを開いている間、全ルームを同時にライブ配信（OBSのシーン切替でルーム切替不要）
  useRoomsSync();
  // ルーム情報を自動でローカルにスナップショット保存（誤削除・データ消失対策）
  useAutoBackup();

  if (!room) return null;

  const previewClass =
    previewBg === "dbd"
      ? "bg-[#0d0d0f] bg-[radial-gradient(circle_at_30%_20%,#2a1818_0%,#0d0d0f_70%)]"
      : previewBg === "transparent"
        ? ""
        : "bg-[repeating-linear-gradient(45deg,#1a1a1a_0_14px,#232323_14px_28px)]";

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <RoomBar />

      <div className="flex-1 grid grid-cols-[420px_1fr] overflow-hidden">
        <div className="border-r border-gray-800 overflow-hidden">
          <SettingsPanel />
        </div>

        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 p-2 border-b border-gray-800 bg-gray-900/60">
            <span className="text-xs text-gray-400">プレビュー背景:</span>
            <select
              value={previewBg}
              onChange={(e) =>
                setPreviewBg(e.target.value as "checker" | "dbd" | "transparent")
              }
              className="h-7 rounded border border-gray-600 bg-gray-700 px-2 text-xs text-white focus:outline-none"
            >
              <option value="checker">市松（透過確認）</option>
              <option value="dbd">DBD風暗背景</option>
              <option value="transparent">完全透明</option>
            </select>

            <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dragEnabled}
                onChange={(e) => setDragEnabled(e.target.checked)}
                className="accent-orange-500"
              />
              <Move className="w-3.5 h-3.5 text-gray-300" />
              <span className="text-xs text-gray-200">
                プレビュー上でドラッグして配置
              </span>
            </label>
          </div>
          <div className={`flex-1 overflow-auto flex items-center justify-center p-4 ${previewClass}`}>
            {/* OBS の 1920x1080 と同じ % 配置になるよう 16:9 ステージでラップ */}
            <div
              className="relative aspect-video w-full"
              style={{ maxWidth: "min(100%, calc((100vh - 220px) * 16 / 9))" }}
            >
              <OverlayView
                settings={room.settings}
                editable={dragEnabled}
                onMovePerkCover={(x, y) =>
                  updateSettings((s) => ({
                    ...s,
                    perkCover: { ...normalizePerkCover(s.perkCover), x, y },
                  }))
                }
                onMoveMatchTimer={(x, y) =>
                  updateSettings((s) => ({
                    ...s,
                    matchTimer: { ...normalizeMatchTimer(s.matchTimer), x, y },
                  }))
                }
                onMoveSessionTimer={(x, y) =>
                  updateSettings((s) => ({
                    ...s,
                    sessionTimer: { ...normalizeSessionTimer(s.sessionTimer), x, y },
                  }))
                }
                onMoveMatchLog={(x, y) =>
                  updateSettings((s) => ({
                    ...s,
                    matchLog: { ...normalizeMatchLog(s.matchLog), x, y },
                  }))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <HotkeyToast message={toast} />
    </div>
  );
}
