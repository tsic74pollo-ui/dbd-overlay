import { useState } from "react";
import { Cable, Wifi, WifiOff, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useObsConnectionContext } from "@/lib/obsConnectionContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

/**
 * OBS WebSocket 連携設定。アプリ全体で 1 つ(ルームごとではない)。
 *
 * ルームに紐付ける `obsSceneName` は RoomActivationEditor 側で設定する。
 * このパネルは「URL / パスワード / ON-OFF」 と接続状態の可視化のみ。
 */
export function ObsConnectionPanel() {
  const obs = useAppStore((s) => s.obs);
  const setObsConfig = useAppStore((s) => s.setObsConfig);
  const { status, error, scenes, currentScene } = useObsConnectionContext();
  const [showPw, setShowPw] = useState(false);

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
          <Cable className="w-4 h-4" />
          OBS 連携 (WebSocket)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">有効</Label>
          <Switch
            checked={obs.enabled}
            onCheckedChange={(v) => setObsConfig({ enabled: v })}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-snug">
        OBS Studio (28+) の WebSocket 機能で、ルーム切替に合わせて OBS のシーンを自動切替できます。
        OBS 側で
        <span className="text-white font-mono mx-1">ツール → WebSocket サーバー設定</span>
        を開き、サーバー有効化 + パスワード設定後にここに入力してください。
      </p>

      {obs.enabled && (
        <>
          <div className="space-y-1">
            <Label className="text-white text-sm">URL</Label>
            <Input
              value={obs.url}
              onChange={(e) => setObsConfig({ url: e.target.value })}
              placeholder="ws://127.0.0.1:4455"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              既定: <span className="font-mono">ws://127.0.0.1:4455</span>(同一PCのOBS)
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-white text-sm">パスワード</Label>
            <div className="flex items-center gap-2">
              <Input
                type={showPw ? "text" : "password"}
                value={obs.password}
                onChange={(e) => setObsConfig({ password: e.target.value })}
                placeholder="(OBSで設定したパスワード)"
                className="flex-1 font-mono"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPw((v) => !v)}
                title={showPw ? "隠す" : "表示"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
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
            {status === "live" && (
              <span className="text-xs text-gray-300">
                現在シーン: <span className="text-white font-mono">{currentScene ?? "—"}</span>
              </span>
            )}
          </div>

          {status === "error" && error && (
            <div className="flex items-start gap-2 bg-red-950/60 border border-red-700/60 rounded px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200 leading-snug">
                {error}
                <br />
                <span className="text-gray-400">
                  OBSが起動しているか / WebSocketサーバーが有効か / パスワードが正しいか を確認してください。
                </span>
              </p>
            </div>
          )}

          {status === "live" && scenes.length > 0 && (
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-white">
                認識しているシーン一覧 ({scenes.length}件)
              </summary>
              <ul className="mt-2 space-y-0.5 pl-3">
                {scenes.map((s) => (
                  <li
                    key={s}
                    className={`font-mono ${s === currentScene ? "text-emerald-300" : "text-gray-300"}`}
                  >
                    {s === currentScene ? "▶ " : "  "}
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
