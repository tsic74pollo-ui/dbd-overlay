import { useRef, useState, type ChangeEvent } from "react";
import { Sparkles, Upload, Play, X } from "lucide-react";
import type { LottieAnimation, LottieTrigger } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";
import { RangeField } from "@/components/ui/Field";
import { LottiePlayer } from "@/components/LottiePlayer";

type Props = {
  value: LottieAnimation;
  onChange: (next: LottieAnimation) => void;
};

const TRIGGERS: { value: LottieTrigger; label: string; hint: string }[] = [
  { value: "room-activate", label: "ルーム切替時", hint: "このルームに切り替わった瞬間" },
  { value: "match-start", label: "マッチ開始時", hint: "T キーでタイマー開始した瞬間" },
  { value: "set-change", label: "SET 切替時", hint: "SET の表示が次に進んだ瞬間(auto/manual 共通)" },
];

export function LottieEditor({ value, onChange }: Props) {
  const set = (p: Partial<LottieAnimation>) => onChange({ ...value, ...p });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewSignal, setPreviewSignal] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  // JSON テキストの妥当性をリアルタイムにチェック
  const handleJsonChange = (text: string) => {
    set({ json: text });
    if (!text.trim()) {
      setParseError(null);
      return;
    }
    try {
      JSON.parse(text);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "JSON 解析エラー");
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      // バリデーション: JSON にパースできるか
      JSON.parse(text);
      set({ json: text, name: value.name || file.name.replace(/\.(json|lottie)$/i, "") });
      setParseError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`ファイル読み込み失敗: ${msg}`);
    }
  };

  const handleClear = () => {
    if (!confirm("現在のアニメーションを削除しますか?")) return;
    set({ json: "", name: "" });
    setParseError(null);
  };

  const handlePreview = () => {
    setPreviewSignal((s) => s + 1);
  };

  const hasJson = !!value.json.trim() && !parseError;

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-300" />
          Lottie アニメーション(イベント連動演出)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">表示</Label>
          <Switch checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-snug">
        Lottie JSON を貼付/アップロードして、ルーム切替時・マッチ開始時・SET 切替時に再生できます。
        <br />
        ヒント: Claude Code 内で
        <span className="text-purple-300 font-mono mx-1">/text-to-lottie</span>
        を使うと自然言語からアニメを生成できます。
      </p>

      {value.enabled && (
        <>
          {/* ファイルアップロード or JSON 貼付 */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <div className="flex items-center justify-between">
              <Label className="text-white text-sm font-semibold">アニメーションデータ</Label>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  title="Lottie JSON ファイルをアップロード"
                >
                  <Upload className="w-3.5 h-3.5" />
                  ファイル
                </Button>
                {hasJson && (
                  <Button size="sm" variant="ghost" onClick={handleClear} title="削除">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </Button>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json,.lottie"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Input
              value={value.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="アニメ名(メモ用・任意)"
              className="text-sm"
            />
            <textarea
              value={value.json}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder='JSON をここに貼付(例: {"v":"5.7.4","fr":30,...})'
              rows={4}
              className="bg-gray-700 text-white border border-gray-600 w-full px-2 py-1.5 rounded text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            {parseError && (
              <p className="text-xs text-red-300">⚠ JSON 解析エラー: {parseError}</p>
            )}
            {hasJson && (
              <Button size="sm" variant="outline" className="w-full" onClick={handlePreview}>
                <Play className="w-3.5 h-3.5" />
                プレビュー再生(下のステージで確認)
              </Button>
            )}
          </div>

          {/* 発火トリガー */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <Label className="text-white text-sm font-semibold">再生タイミング</Label>
            <div className="flex flex-col gap-1.5">
              {TRIGGERS.map((t) => (
                <label
                  key={t.value}
                  className="flex items-start gap-2 p-2 rounded bg-gray-700 cursor-pointer hover:bg-gray-650"
                >
                  <input
                    type="radio"
                    name="lottie-trigger"
                    checked={value.trigger === t.value}
                    onChange={() => set({ trigger: t.value })}
                    className="mt-0.5 accent-purple-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm text-white">{t.label}</div>
                    <div className="text-xs text-gray-400">{t.hint}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-white text-xs">ループ再生(常時)</Label>
              <Switch checked={value.loop} onCheckedChange={(v) => set({ loop: v })} />
            </div>
            {!value.loop && (
              <RangeField
                label="フェードアウト時間"
                value={value.fadeOutMs}
                min={50}
                max={3000}
                step={50}
                onChange={(v) => set({ fadeOutMs: Math.round(v) })}
                format={(v) => `${Math.round(v)} ms`}
              />
            )}
          </div>

          {/* 位置/サイズ */}
          <details className="text-xs">
            <summary className="text-gray-400 cursor-pointer hover:text-white">
              位置/サイズ
            </summary>
            <div className="space-y-2 pt-2">
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
                min={5}
                max={100}
                step={0.5}
                onChange={(v) => set({ width: v })}
                unit="%"
              />
            </div>
          </details>

          {/* プレビューエリア */}
          {hasJson && (
            <div className="relative rounded border border-gray-700 bg-gray-900 aspect-video overflow-hidden">
              <div className="absolute inset-0">
                <LottiePlayer animation={value} playSignal={previewSignal} />
              </div>
              <div className="absolute top-1 left-2 text-[10px] text-gray-500">プレビュー</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
