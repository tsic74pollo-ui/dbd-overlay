import { useState } from "react";
import { ListChecks, Trash2, Check } from "lucide-react";
import type { MatchLogWidget } from "@/lib/types";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField } from "@/components/ui/Field";

type Props = {
  value: MatchLogWidget;
  onChange: (next: MatchLogWidget) => void;
};

const QUICK_RESULTS = ["4K", "3K", "2K", "1K", "0K"];

export function MatchLogEditor({ value, onChange }: Props) {
  const set = (p: Partial<MatchLogWidget>) => onChange({ ...value, ...p });
  const recordMatchResult = useAppStore((s) => s.recordMatchResult);
  const clearMatchLog = useAppStore((s) => s.clearMatchLog);

  // 結果入力フォームの状態
  const [resultText, setResultText] = useState("");
  const [killerOverride, setKillerOverride] = useState("");
  const [playerOverride, setPlayerOverride] = useState("");
  const [isWin, setIsWin] = useState<boolean | null>(null);

  const handleQuickResult = (r: string) => {
    setResultText(r);
    // 4K/3K は自動で勝利
    if (r === "4K" || r === "3K") setIsWin(true);
    else if (r === "0K") setIsWin(false);
  };

  const handleRecord = () => {
    if (!resultText.trim()) return;
    recordMatchResult({
      result: resultText.trim(),
      killer: killerOverride.trim() || undefined,
      player: playerOverride.trim() || undefined,
      isWin: isWin ?? undefined,
    });
    // 入力をクリア
    setResultText("");
    setKillerOverride("");
    setPlayerOverride("");
    setIsWin(null);
  };

  const handleClearAll = () => {
    if (!confirm("今日のマッチ記録を全部消しますか?(この操作は取り消せません)")) return;
    clearMatchLog();
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-amber-300" />
          マッチログ(今日のスクリム結果)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      {value.enabled && (
        <>
          {/* 結果記録フォーム(最頻使用ブロック) */}
          <div className="space-y-2 p-3 bg-gray-750 rounded border border-amber-700/40">
            <Label className="text-white text-sm font-semibold">
              現在マッチの結果を記録
              {value.currentMatchNo != null && (
                <span className="text-amber-300 font-mono ml-2">M{value.currentMatchNo}</span>
              )}
            </Label>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_RESULTS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleQuickResult(r)}
                  className={
                    "px-3 py-1.5 rounded text-xs font-bold border transition " +
                    (resultText === r
                      ? "bg-amber-500 border-amber-400 text-white"
                      : "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600")
                  }
                >
                  {r}
                </button>
              ))}
            </div>

            <Input
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="または自由入力(例: 3K+1E, DC, Cancel)"
              className="text-sm"
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWin === true}
                  onChange={(e) => setIsWin(e.target.checked ? true : null)}
                  className="accent-emerald-500"
                />
                ✓ 勝利マーク
              </label>
            </div>

            {/* オーバーライド(任意。空なら現在の SET から自動取得) */}
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-white">
                Killer / Player を手動で上書き(任意)
              </summary>
              <div className="mt-2 space-y-1.5">
                <Input
                  value={killerOverride}
                  onChange={(e) => setKillerOverride(e.target.value)}
                  placeholder="Killer (空欄で現SET から自動)"
                  className="text-sm"
                />
                <Input
                  value={playerOverride}
                  onChange={(e) => setPlayerOverride(e.target.value)}
                  placeholder="Player (空欄で現SET から自動)"
                  className="text-sm"
                />
              </div>
            </details>

            <Button
              size="sm"
              className="w-full"
              onClick={handleRecord}
              disabled={!resultText.trim()}
            >
              <Check className="w-3.5 h-3.5" />
              結果を記録 + マッチタイマーリセット
            </Button>
          </div>

          {/* 蓄積された記録一覧 */}
          <div className="space-y-1 p-3 bg-gray-750 rounded">
            <div className="flex items-center justify-between">
              <Label className="text-white text-xs font-semibold">
                記録済み({value.records.length}件)
              </Label>
              {value.records.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearAll} title="全消去">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              )}
            </div>
            {value.records.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">まだ記録なし</p>
            ) : (
              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                {value.records.map((r) => (
                  <div
                    key={r.matchNo}
                    className="flex items-center gap-2 text-xs py-0.5 font-mono text-gray-200"
                  >
                    <span className="text-amber-300 w-6">M{r.matchNo}</span>
                    <span className="flex-1 truncate">
                      {r.killer} / {r.player}
                    </span>
                    <span className={r.isWin ? "text-emerald-300 font-bold" : "text-white"}>
                      {r.result}
                    </span>
                    <span className="w-3 text-emerald-300">{r.isWin ? "✓" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* スタイル設定 */}
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-white">
              ウィジェットの位置/サイズ/見た目
            </summary>
            <div className="space-y-2 pt-2">
              <Input
                value={value.titleText}
                onChange={(e) => set({ titleText: e.target.value })}
                placeholder="見出し(例: TODAY'S SCRIM, 本日の結果)"
                className="text-sm"
              />
              <RangeField
                label="位置 X"
                value={value.x}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => set({ x: v })}
                axis="x"
                unit="%"
              />
              <RangeField
                label="位置 Y"
                value={value.y}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => set({ y: v })}
                axis="y"
                unit="%"
              />
              <RangeField
                label="横幅"
                value={value.width}
                min={10}
                max={60}
                step={0.5}
                onChange={(v) => set({ width: v })}
                unit="%"
              />
              <RangeField
                label="フォントサイズ倍率"
                value={value.fontScale}
                min={0.5}
                max={1.5}
                step={0.05}
                onChange={(v) => set({ fontScale: v })}
                format={(v) => v.toFixed(2)}
              />
              <RangeField
                label="最大表示行数"
                value={value.maxVisibleRows}
                min={1}
                max={20}
                step={1}
                onChange={(v) => set({ maxVisibleRows: Math.round(v) })}
                format={(v) => `${Math.round(v)} 行`}
              />
              <ColorField
                label="背景色"
                value={value.bgColor}
                onChange={(v) => set({ bgColor: v })}
              />
              <RangeField
                label="背景透過"
                value={value.bgOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => set({ bgOpacity: v })}
                displayScale={100}
                unit="%"
              />
              <div className="flex items-center justify-between pt-1">
                <Label className="text-white text-xs">進行中マッチをハイライト</Label>
                <Switch
                  checked={value.showCurrentMatchHighlight}
                  onCheckedChange={(v) => set({ showCurrentMatchHighlight: v })}
                />
              </div>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
