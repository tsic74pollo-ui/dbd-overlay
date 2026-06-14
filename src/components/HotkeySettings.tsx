import { useEffect, useState } from "react";
import { Keyboard, RotateCcw, X } from "lucide-react";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import {
  useEffectiveHotkeys,
  type HotkeyMod,
  type HotkeyOverride,
} from "@/lib/useEffectiveHotkeys";
import type { RemoteCommand } from "@/lib/hotkeyActions";

/** "Shift+T" のようなラベルに整形 */
function describeKey(key: string, mods?: HotkeyMod[]): string {
  const ks = mods?.includes("ctrl") ? ["Ctrl"] : [];
  if (mods?.includes("alt")) ks.push("Alt");
  if (mods?.includes("shift")) ks.push("Shift");
  ks.push(key === " " ? "Space" : key.toUpperCase());
  return ks.join("+");
}

/**
 * UX 設計:
 *  - 各アクションごとに「現在キー」を chip 風に表示
 *  - [変更] でモーダル → 「次に押すキーが記録されます」 → 競合チェック → 保存
 *  - [↶] で個別キーをデフォルト復帰
 *  - 行が競合状態なら chip を赤枠で警告
 */
export function HotkeySettings() {
  const { effective, overrides, setOverride, resetAll, hasConflict } =
    useEffectiveHotkeys();
  const [capturing, setCapturing] = useState<RemoteCommand | null>(null);

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center gap-2">
        <Keyboard className="w-4 h-4 text-orange-300" />
        <Label className="text-white font-semibold">ホットキー設定</Label>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        各操作のキーをクリックして変更できます。OBSや他ソフトと競合する場合は
        修飾キー(Shift/Ctrl/Alt)を付けて逃せます。
      </p>

      <ul className="space-y-1.5">
        {effective.map((a) => {
          const isOverride = overrides[a.id] !== undefined;
          const conflict = hasConflict(a.id, a.key, a.mods);
          return (
            <li
              key={a.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 border border-gray-700/60 rounded"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-100 truncate">{a.label}</div>
                {conflict && (
                  <div className="text-[10px] text-red-300 mt-0.5">
                    ⚠ 別アクションと同じキーです
                  </div>
                )}
              </div>
              <kbd
                className={`font-mono text-xs px-2.5 py-1 rounded border ${
                  conflict
                    ? "bg-red-900/40 border-red-500/60 text-red-100"
                    : "bg-gray-700 border-gray-600 text-gray-100"
                }`}
              >
                {describeKey(a.key, a.mods)}
              </kbd>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCapturing(a.id)}
                title="クリックして次に押すキーが記録されます"
              >
                変更
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOverride(a.id, null)}
                title="既定に戻す"
                disabled={!isOverride}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={resetAll}
          disabled={Object.keys(overrides).length === 0}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          全部既定に戻す
        </Button>
      </div>

      {capturing && (
        <KeyCaptureModal
          actionId={capturing}
          actionLabel={
            effective.find((a) => a.id === capturing)?.label ?? ""
          }
          onCapture={(ov) => {
            setOverride(capturing, ov);
            setCapturing(null);
          }}
          onCancel={() => setCapturing(null)}
          hasConflict={hasConflict}
        />
      )}
    </div>
  );
}

function KeyCaptureModal({
  actionId,
  actionLabel,
  onCapture,
  onCancel,
  hasConflict,
}: {
  actionId: RemoteCommand;
  actionLabel: string;
  onCapture: (ov: HotkeyOverride) => void;
  onCancel: () => void;
  hasConflict: (id: RemoteCommand, key: string, mods?: HotkeyMod[]) => boolean;
}) {
  const [last, setLast] = useState<HotkeyOverride | null>(null);
  const conflict = last
    ? hasConflict(actionId, last.key, last.mods)
    : false;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // モーダル中はすべてのキーを横取り
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      // 修飾キー単独はスキップ(本キーが来るまで)
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta")
        return;
      const mods: HotkeyMod[] = [];
      if (e.shiftKey) mods.push("shift");
      if (e.ctrlKey || e.metaKey) mods.push("ctrl");
      if (e.altKey) mods.push("alt");
      setLast({ key: e.key.toLowerCase(), mods: mods.length ? mods : undefined });
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-orange-300" />
          <h3 className="text-base font-semibold text-white">
            キー設定: {actionLabel}
          </h3>
          <button
            onClick={onCancel}
            className="ml-auto text-gray-400 hover:text-gray-100"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded p-6 text-center">
          {last ? (
            <>
              <div className="text-xs text-gray-400 mb-1.5">記録されたキー</div>
              <kbd
                className={`font-mono text-2xl px-4 py-2 rounded border ${
                  conflict
                    ? "bg-red-900/40 border-red-500/60 text-red-100"
                    : "bg-gray-700 border-gray-500 text-orange-200"
                }`}
              >
                {(last.mods ?? []).map((m) => m[0]!.toUpperCase()).join("+")}
                {last.mods?.length ? "+" : ""}
                {last.key === " " ? "Space" : last.key.toUpperCase()}
              </kbd>
              {conflict && (
                <div className="text-xs text-red-300 mt-3">
                  ⚠ 別アクションと同じキーです(保存はできますが、意図的な競合になります)
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-300">
              次に押したいキーを押してください
              <div className="text-xs text-gray-500 mt-2">
                Esc で取消 / 修飾キーは Shift・Ctrl・Alt
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button
            size="sm"
            disabled={!last}
            onClick={() => last && onCapture(last)}
          >
            この組合せで保存
          </Button>
        </div>
      </div>
    </div>
  );
}
