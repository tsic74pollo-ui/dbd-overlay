import { useEffect, useMemo, useState } from "react";
import { ListChecks, Trash2, Check, Zap, Skull } from "lucide-react";
import type { MatchLogWidget } from "@/lib/types";
import { isSetsLine } from "@/lib/types";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField, ColorField } from "@/components/ui/Field";

type Props = {
  value: MatchLogWidget;
  onChange: (next: MatchLogWidget) => void;
};

export function MatchLogEditor({ value, onChange }: Props) {
  const set = (p: Partial<MatchLogWidget>) => onChange({ ...value, ...p });
  const recordMatchResult = useAppStore((s) => s.recordMatchResult);
  const clearMatchLog = useAppStore((s) => s.clearMatchLog);
  const room = useAppStore(selectActiveRoom);

  // 現在の SET から killer を自動取得(表示プレビュー用。空欄なら手動入力)
  const autoKiller = useMemo(() => {
    if (!room) return "";
    const sl = room.settings.lines.find(isSetsLine);
    if (!sl) return "";
    const idx = Math.min(
      Math.max(0, sl.currentSetIndex ?? 0),
      Math.max(0, sl.sets.length - 1),
    );
    return sl.sets[idx]?.killerName ?? "";
  }, [room]);

  // 入力ステート
  const [killerOverride, setKillerOverride] = useState("");
  const [note, setNote] = useState("");
  const [kills, setKills] = useState(0);
  const [stages, setStages] = useState(0);
  const [isPowered, setIsPowered] = useState(true);
  const [gensRemaining, setGensRemaining] = useState<number | null>(null);

  // 通電 OFF + G 残数指定 = 4K12S 確定 → K/S 入力ロック
  const lockedFull = !isPowered && gensRemaining !== null;

  // 通電 ON に切替えたら G 残数はクリア
  useEffect(() => {
    if (isPowered) setGensRemaining(null);
  }, [isPowered]);

  const handleRecord = () => {
    recordMatchResult({
      killer: killerOverride.trim() || undefined,
      note: note.trim() || undefined,
      kills: lockedFull ? 4 : kills,
      stages: lockedFull ? 12 : stages,
      isPowered,
      gensRemaining: gensRemaining ?? undefined,
    });
    // 入力をクリア
    setKillerOverride("");
    setNote("");
    setKills(0);
    setStages(0);
    setIsPowered(true);
    setGensRemaining(null);
  };

  const handleClearAll = () => {
    if (!confirm("今日のマッチ記録を全部消しますか?(この操作は取り消せません)")) return;
    clearMatchLog();
  };

  // K/S 入力可能か(通電 ON のみ。通電 OFF + G 指定で 4/12 固定)
  const ksEditable = !lockedFull;
  const effectiveKills = lockedFull ? 4 : kills;
  const effectiveStages = lockedFull ? 12 : stages;

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
          {/* 結果記録フォーム */}
          <div className="space-y-2 p-3 bg-gray-750 rounded border border-amber-700/40">
            <Label className="text-white text-sm font-semibold">
              現在マッチの結果を記録
              {value.currentMatchNo != null && (
                <span className="text-amber-300 font-mono ml-2">M{value.currentMatchNo}</span>
              )}
            </Label>

            {/* Killer (自動 / オーバーライド) */}
            <div className="space-y-1">
              <Label className="text-white text-xs">
                Killer
                <span className="text-gray-400 ml-1">
                  (現SET: <span className="text-amber-300 font-mono">{autoKiller || "(未設定)"}</span>)
                </span>
              </Label>
              <Input
                value={killerOverride}
                onChange={(e) => setKillerOverride(e.target.value)}
                placeholder={`空欄で SET から自動取得 (${autoKiller || "?"})`}
                className="text-sm"
              />
            </div>

            {/* Note (フリーワード) */}
            <div className="space-y-1">
              <Label className="text-white text-xs">メモ / マップ名 / 自由記述</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例: Dead Dawg Saloon Killer Pick"
                className="text-sm"
              />
            </div>

            {/* 通電 (勝利マーク代わり) */}
            <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
              <Label className="text-white text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-300" />
                通電(発電機完了) — ✓ マーク
              </Label>
              <Switch checked={isPowered} onCheckedChange={setIsPowered} />
            </div>

            {/* K / S 入力 */}
            <div className="space-y-1">
              <Label className="text-white text-xs flex items-center justify-between">
                <span>キル数 K (0-4)</span>
                {lockedFull && (
                  <span className="text-xs text-red-300">↓ 4K12S で固定中</span>
                )}
              </Label>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((k) => {
                  const active = effectiveKills === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!ksEditable}
                      onClick={() => setKills(k)}
                      className={
                        "flex-1 py-1.5 rounded text-xs font-bold border transition " +
                        (!ksEditable
                          ? "bg-gray-700 border-gray-700 text-gray-500 cursor-not-allowed"
                          : active
                            ? "bg-amber-500 border-amber-400 text-white"
                            : "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600")
                      }
                    >
                      {k}K
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-white text-xs">ステージ数 S (0-12)</Label>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={effectiveStages}
                disabled={!ksEditable}
                onChange={(e) => setStages(parseInt(e.target.value, 10))}
                className="w-full disabled:opacity-40"
              />
              <div className="text-xs text-gray-300 text-center font-mono">
                {effectiveStages}S
              </div>
            </div>

            {/* 通電 OFF 時のみ G 残数入力 */}
            {!isPowered && (
              <div className="space-y-1 p-2 bg-red-950/30 border border-red-800/40 rounded">
                <Label className="text-white text-xs flex items-center gap-1">
                  <Skull className="w-3.5 h-3.5 text-red-300" />
                  発電機残数 G (1-5) ※ 全滅(4K12S)時の残ジェネ
                </Label>
                <div className="flex gap-1.5">
                  {[5, 4, 3, 2, 1].map((g) => {
                    const active = gensRemaining === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGensRemaining(g)}
                        className={
                          "flex-1 py-1.5 rounded text-xs font-bold border transition " +
                          (active
                            ? "bg-red-500 border-red-400 text-white"
                            : "bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600")
                        }
                      >
                        {g}G
                      </button>
                    );
                  })}
                </div>
                {gensRemaining !== null && (
                  <p className="text-xs text-red-300 leading-snug pt-1">
                    入力済み: 4K12S 確定 → K/S 入力はロック
                  </p>
                )}
              </div>
            )}

            <Button
              size="sm"
              className="w-full"
              onClick={handleRecord}
              disabled={!isPowered && gensRemaining === null}
              title={
                !isPowered && gensRemaining === null
                  ? "通電 OFF の場合は G 残数を選択してください"
                  : "結果を記録"
              }
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
                {value.records.map((r) => {
                  const rightCol = r.isPowered ? "✓" : `${r.gensRemaining ?? "?"}G`;
                  return (
                    <div
                      key={r.matchNo}
                      className="flex items-center gap-2 text-xs py-0.5 font-mono text-gray-200"
                    >
                      <span className="text-amber-300 w-6">M{r.matchNo}</span>
                      <span className="flex-1 truncate">
                        {r.killer}
                        {r.note && (
                          <span className="opacity-60 ml-1">{r.note}</span>
                        )}
                      </span>
                      <span className="text-white">
                        {r.kills}K/{r.stages}S
                      </span>
                      <span
                        className={
                          "w-8 text-right " +
                          (r.isPowered ? "text-emerald-300 font-bold" : "text-red-300 font-bold")
                        }
                      >
                        {rightCol}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* スタイル設定 */}
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-white">
              ウィジェットの位置/サイズ/見た目
            </summary>
            <div className="space-y-2 pt-2">
              <p className="text-xs text-gray-400 italic">
                💡 プレビュー上で直接ドラッグして配置調整も可能です
              </p>
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
