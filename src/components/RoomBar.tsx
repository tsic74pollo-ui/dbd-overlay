import { useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  Copy,
  Plus,
  Trash2,
  Pencil,
  X,
  Download,
  Upload,
  History,
  HelpCircle,
} from "lucide-react";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { useConnectionStore } from "@/store/connectionStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  exportRoomsToFile,
  importRoomsFromFile,
  mergeRoomsById,
  readSnapshots,
} from "@/lib/backup";
import { LAYOUTS, LAYOUT_IDS } from "@/components/overlay/layoutRegistry";
import type { LayoutId } from "@/lib/types";

export function RoomBar({ onOpenGuide }: { onOpenGuide?: () => void }) {
  const rooms = useAppStore((s) => s.rooms);
  const activeRoomId = useAppStore((s) => s.activeRoomId);
  const setActive = useAppStore((s) => s.setActiveRoom);
  const addRoom = useAppStore((s) => s.addRoom);
  const duplicate = useAppStore((s) => s.duplicateRoom);
  const remove = useAppStore((s) => s.removeRoom);
  const rename = useAppStore((s) => s.renameRoom);
  const setRooms = useAppStore((s) => s.setRooms);
  const update = useAppStore((s) => s.updateActiveRoomSettings);
  const status = useConnectionStore((s) => s.status);
  const lastError = useConnectionStore((s) => s.lastError);

  const active = useAppStore(selectActiveRoom);
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState(() => readSnapshots());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!active) return null;

  const overlayUrl = `${window.location.origin}/overlay?room=${active.id}`;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // http(LAN IP)等では clipboard API 不可 → 選択可能な形で提示して手動コピー
      window.prompt("この環境では自動コピーできません。手動でコピーしてください:", overlayUrl);
    }
  };

  const startRename = () => {
    setDraft(active.name);
    setEditingName(true);
  };

  const commitRename = () => {
    if (draft.trim()) rename(active.id, draft.trim());
    setEditingName(false);
  };

  const handleExport = () => {
    exportRoomsToFile(rooms, activeRoomId);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { rooms: incoming, activeRoomId: incomingActive } =
        await importRoomsFromFile(file);
      const existingIds = new Set(rooms.map((r) => r.id));
      const replaced = incoming.filter((r) => existingIds.has(r.id)).length;
      const added = incoming.length - replaced;
      const ok = confirm(
        `バックアップを読み込みます:\n  追加: ${added} 件\n  上書き（同IDのルーム）: ${replaced} 件\n続行しますか？`,
      );
      if (!ok) return;
      const merged = mergeRoomsById(rooms, incoming);
      setRooms(merged, incomingActive);
    } catch (err) {
      alert(
        `読み込みエラー: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const openHistory = () => {
    setSnapshots(readSnapshots());
    setHistoryOpen(true);
  };

  const restoreSnapshot = (idx: number) => {
    const snap = snapshots[idx];
    if (!snap) return;
    const existingIds = new Set(rooms.map((r) => r.id));
    const replaced = snap.rooms.filter((r) => existingIds.has(r.id)).length;
    const added = snap.rooms.length - replaced;
    const when = new Date(snap.savedAt).toLocaleString("ja-JP");
    if (
      !confirm(
        `${when} のスナップショットから復元:\n  追加: ${added} 件\n  上書き: ${replaced} 件\n続行しますか？`,
      )
    )
      return;
    const merged = mergeRoomsById(rooms, snap.rooms);
    setRooms(merged, snap.activeRoomId);
    setHistoryOpen(false);
  };

  const statusDot =
    status === "live"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : status === "offline" || status === "error"
          ? "bg-red-400"
          : "bg-gray-500";

  const statusText =
    status === "live"
      ? "Live"
      : status === "connecting"
        ? "接続中"
        : status === "offline"
          ? "Offline"
          : status === "error"
            ? "Error"
            : "Idle";

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-900/90 border-b border-gray-800">
        <span className="text-xs text-gray-400">ルーム:</span>

        {editingName ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="h-8 w-40"
            />
            <Button size="sm" variant="ghost" onClick={commitRename}>
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingName(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <select
              value={activeRoomId}
              onChange={(e) => setActive(e.target.value)}
              className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={startRename} title="名前変更">
              <Pencil className="w-4 h-4" />
            </Button>
          </>
        )}

        <Button size="sm" variant="outline" onClick={() => addRoom()}>
          <Plus className="w-4 h-4" />
          追加
        </Button>
        <Button size="sm" variant="outline" onClick={() => duplicate(active.id)}>
          複製
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => {
            if (confirm(`「${active.name}」を削除しますか？`)) remove(active.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
          削除
        </Button>

        <div className="mx-2 h-6 w-px bg-gray-700" />

        <label
          className="text-xs text-gray-400 flex items-center gap-1.5"
          title="オーバーレイ全体の見た目テンプレート(ルームごと記憶)"
        >
          レイアウト:
          <select
            value={active.settings.layoutId ?? "classic"}
            onChange={(e) =>
              update((s) => ({ ...s, layoutId: e.target.value as LayoutId }))
            }
            className="h-8 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            {LAYOUT_IDS.map((id) => (
              <option key={id} value={id} title={LAYOUTS[id].description}>
                {LAYOUTS[id].label}
              </option>
            ))}
          </select>
        </label>

        <div className="mx-2 h-6 w-px bg-gray-700" />

        <Button size="sm" variant="outline" onClick={copyUrl} title={overlayUrl}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Browser Source URL
        </Button>

        <div className="mx-2 h-6 w-px bg-gray-700" />

        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          title="全ルームを JSON ファイルでバックアップ保存"
        >
          <Download className="w-4 h-4" />
          書き出し
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleImportClick}
          title="バックアップ JSON を読み込んでマージ"
        >
          <Upload className="w-4 h-4" />
          読み込み
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={openHistory}
          title="自動スナップショットから復元"
        >
          <History className="w-4 h-4" />
          履歴
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} />
            <span className="text-xs text-gray-300">{statusText}</span>
            {status === "error" && lastError && (
              <span
                className="text-[11px] text-red-300 max-w-[320px] truncate"
                title={lastError}
              >
                {lastError}
              </span>
            )}
          </div>
          {onOpenGuide && (
            <button
              type="button"
              onClick={onOpenGuide}
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-white underline-offset-2 hover:underline"
              title="セットアップガイドを開く"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              使い方
            </button>
          )}
        </div>
      </div>

      {historyOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-lg max-h-[80vh] overflow-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">
                自動スナップショット履歴
              </h3>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-gray-400 hover:text-white"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400">
              編集中に自動で保存された最新の最大 10 件のスナップショットから、ルームを復元できます（同 ID は上書き、新規 ID は追加）。
            </p>
            {snapshots.length === 0 ? (
              <p className="text-sm text-gray-300 py-6 text-center">
                まだスナップショットがありません。
              </p>
            ) : (
              <div className="space-y-2">
                {snapshots
                  .map((s, i) => ({ s, i }))
                  .reverse()
                  .map(({ s, i }) => (
                    <div
                      key={s.savedAt + i}
                      className="flex items-center justify-between gap-2 p-3 bg-gray-800 rounded"
                    >
                      <div className="text-sm flex-1 min-w-0">
                        <div className="text-white">
                          {new Date(s.savedAt).toLocaleString("ja-JP")}
                        </div>
                        <div
                          className="text-xs text-gray-400 truncate"
                          title={s.rooms.map((r) => r.name).join(", ")}
                        >
                          {s.rooms.length} 件: {s.rooms.map((r) => r.name).join(", ")}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => restoreSnapshot(i)}>
                        復元
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
