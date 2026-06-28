import { Mic, Wifi, WifiOff, AlertCircle, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useLocalVocalContext } from "@/lib/localVocalContext";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

/** LocalVocal(OBS プラグイン)WebSocket 連携の設定 UI。
 *  画面下のキャプション(音声 → 翻訳 → 字幕)用。 */
export function LocalVocalPanel() {
  const cfg = useAppStore((s) => s.localVocal);
  const setCfg = useAppStore((s) => s.setLocalVocalConfig);
  const { status, error } = useLocalVocalContext();

  const statusDot =
    status === "live"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : status === "error"
          ? "bg-red-400"
          : "bg-gray-500";

  const statusText =
    status === "live"
      ? "接続済み"
      : status === "connecting"
        ? "接続中…"
        : status === "error"
          ? "エラー"
          : "未接続";

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold flex items-center gap-2">
          <Mic className="w-4 h-4 text-fuchsia-300" />
          LocalVocal 連携(音声→翻訳字幕)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">有効</Label>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={(v) => setCfg({ enabled: v })}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-snug">
        OBS Studio に LocalVocal プラグインを入れて、音声を Whisper で日本語認識 →
        英訳した結果を画面下の字幕(CaptionWidget)に流します。
        セットアップ手順は <span className="text-fuchsia-300">docs/localvocal-setup.md</span> を参照。
      </p>

      {cfg.enabled && (
        <>
          <div className="space-y-1">
            <Label className="text-white text-sm">WebSocket URL</Label>
            <Input
              value={cfg.url}
              onChange={(e) => setCfg({ url: e.target.value })}
              placeholder="ws://127.0.0.1:9999"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              既定: <span className="font-mono">ws://127.0.0.1:9999</span>
              (LocalVocal の設定で指定したポート)
            </p>
          </div>

          {/* 状態表示 */}
          <div className="flex items-center justify-between bg-gray-750 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${statusDot}`} />
              {status === "live" ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span className="text-sm text-gray-200">{statusText}</span>
            </div>
            <a
              href="https://github.com/locaal-ai/obs-localvocal"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              title="LocalVocal GitHub"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {status === "error" && error && (
            <div className="flex items-start gap-2 bg-red-950/60 border border-red-700/60 rounded px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-snug">
                {error}
                <br />
                <span className="text-gray-400">
                  OBS が起動しているか / LocalVocal の WebSocket 出力が有効か /
                  ポート番号が一致しているか を確認してください。
                </span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
