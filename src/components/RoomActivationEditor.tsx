import { useEffect, useState } from "react";
import { Sparkles, Cable, RotateCcw } from "lucide-react";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { useObsConnectionContext } from "@/lib/obsConnectionContext";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

/**
 * 現在のルームを「アクティブ化したとき」 の動作設定。
 *   - OBS シーン切替: ルームに紐付けた OBS シーン名へ自動切替
 *   - マッチタイマー自動 reset: マッチ画面に戻った瞬間に 0 リセット
 *
 * リモコンの「次のルームへ」、エディタの N キー、ルーム選択ドロップダウン、
 * いずれから切替えても同じ副作用が走る。
 */
export function RoomActivationEditor() {
  const room = useAppStore(selectActiveRoom);
  const patchRoom = useAppStore((s) => s.patchRoom);
  const obsEnabled = useAppStore((s) => s.obs.enabled);
  const { status, scenes, currentScene } = useObsConnectionContext();

  if (!room) return null;

  const obsSceneName = room.obsSceneName ?? "";
  const resetFlag = !!room.resetMatchTimerOnActivate;

  // 保存されているシーン名がリストに無い(OBSで改名された等)場合は手入力モードを既定にする
  const [manualMode, setManualMode] = useState(
    obsSceneName !== "" && !scenes.includes(obsSceneName),
  );
  // 切替時にシーン一覧が後から届くケースに追従
  useEffect(() => {
    if (obsSceneName !== "" && !scenes.includes(obsSceneName)) setManualMode(true);
  }, [obsSceneName, scenes]);

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <Label className="text-white font-semibold flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-orange-400" />
        ルーム切替時の動作 ({room.name})
      </Label>

      <p className="text-xs text-gray-400 leading-snug">
        このルームに切り替わった瞬間(N キー / リモコン / ルーム選択)に走る自動アクションです。
      </p>

      {/* OBS シーン切替 */}
      <div className="space-y-2 p-3 bg-gray-750 rounded">
        <Label className="text-white text-sm font-semibold flex items-center gap-2">
          <Cable className="w-3.5 h-3.5" />
          OBS シーンを切替
        </Label>

        {!obsEnabled && (
          <p className="text-xs text-amber-300">
            上の「OBS 連携」 を有効にすると、ここでシーン名を選べるようになります。
          </p>
        )}

        {obsEnabled && status !== "live" && (
          <p className="text-xs text-amber-300">
            OBS に未接続。接続が確立されるとシーン一覧が表示されます。
          </p>
        )}

        {obsEnabled && status === "live" && (
          <>
            {!manualMode ? (
              <div className="flex items-center gap-2">
                <select
                  value={obsSceneName}
                  onChange={(e) => patchRoom(room.id, { obsSceneName: e.target.value })}
                  className="flex-1 h-9 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white"
                >
                  <option value="">(連動しない)</option>
                  {scenes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                      {s === currentScene ? "  ◀ 現在" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setManualMode(true)}
                  className="text-xs text-gray-400 hover:text-white underline whitespace-nowrap"
                >
                  手入力
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={obsSceneName}
                  onChange={(e) => patchRoom(room.id, { obsSceneName: e.target.value })}
                  placeholder="OBSのシーン名(完全一致)"
                  className="flex-1 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setManualMode(false)}
                  className="text-xs text-gray-400 hover:text-white underline whitespace-nowrap"
                >
                  リスト
                </button>
              </div>
            )}

            {obsSceneName && !scenes.includes(obsSceneName) && (
              <p className="text-xs text-red-300">
                ⚠ OBS にこの名前のシーンが見つかりません: <span className="font-mono">{obsSceneName}</span>
              </p>
            )}
          </>
        )}
      </div>

      {/* マッチタイマー 自動 reset */}
      <div className="flex items-start justify-between gap-3 p-3 bg-gray-750 rounded">
        <div className="flex-1 min-w-0">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <RotateCcw className="w-3.5 h-3.5" />
            マッチタイマーを 0 リセット
          </Label>
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            このルームに切替わった瞬間にマッチタイマーを 00:00 に巻き戻します。
            例: 「マッチ画面」 ルームに ON にしておくと、待機画面 → マッチ画面の遷移で毎マッチ自動的に 0 開始の状態になります。
          </p>
        </div>
        <Switch
          checked={resetFlag}
          onCheckedChange={(v) => patchRoom(room.id, { resetMatchTimerOnActivate: v })}
        />
      </div>
    </div>
  );
}
