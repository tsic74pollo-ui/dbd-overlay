import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Copy, Check, AlertTriangle, HelpCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

const LAN_HOST_KEY = "dbd-overlay:lan-host:v1";

/**
 * リモコン用 URL は QR でスマホに渡される。デフォルトの `window.location.origin`
 * は `http://localhost:5173/` 等になるが、**localhost はスマホからはスマホ自身を指す**
 * ため接続できない。
 *
 *  → PC の LAN IP(例: 192.168.11.7)を入れて origin を上書きする。
 *  → Vite 側は `server.host: true` で 0.0.0.0 にバインド済(vite.config.ts)。
 */
export function RemoteUrlPanel() {
  const activeRoomId = useAppStore((s) => s.activeRoomId);
  const [copied, setCopied] = useState(false);
  const [lanHostInput, setLanHostInput] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  // localStorage から復元
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(LAN_HOST_KEY);
      if (v) setLanHostInput(v);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (v: string) => {
    setLanHostInput(v);
    try {
      if (v.trim()) window.localStorage.setItem(LAN_HOST_KEY, v.trim());
      else window.localStorage.removeItem(LAN_HOST_KEY);
    } catch {
      /* ignore */
    }
  };

  const isOnLocalhost = useMemo(() => {
    if (typeof window === "undefined") return false;
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  }, []);

  const baseOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    const trimmed = lanHostInput.trim();
    if (!trimmed) return window.location.origin;
    const proto = window.location.protocol;
    const port = window.location.port;
    const hasPort = /:\d+$/.test(trimmed);
    return `${proto}//${trimmed}${hasPort || !port ? "" : `:${port}`}`;
  }, [lanHostInput]);

  const url = `${baseOrigin}/remote?r=${activeRoomId}`;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* noop */
    }
  };

  const showLocalhostWarning = isOnLocalhost && !lanHostInput.trim();

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-orange-300" />
        <Label className="text-white font-semibold">リモコン端末</Label>
        <button
          onClick={() => setHelpOpen((v) => !v)}
          className="ml-auto text-gray-400 hover:text-gray-100"
          title="セットアップ手順を表示"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        下のQRをスマホで読み取るか、URLをコピーしてサブモニターのブラウザに貼ると、
        マッチタイマー開始/停止・カバー開放・ルーム切替を遠隔操作できます。
      </p>

      {/* LAN IP 入力 */}
      <div className="space-y-1.5">
        <Label className="text-white text-sm">PCのLAN IP / ホスト</Label>
        <input
          value={lanHostInput}
          onChange={(e) => persist(e.target.value)}
          placeholder="例: 192.168.11.7  (空ならブラウザのオリジン)"
          className="w-full h-9 rounded border border-gray-600 bg-gray-700 px-2.5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <p className="text-[11px] text-gray-500 leading-snug">
          スマホからは <span className="font-mono">localhost</span>{" "}
          に繋がりません。Vite 起動ログの <span className="font-mono">Network:</span>{" "}
          行の IP を入れてください(例: <span className="font-mono">192.168.11.7</span>)。
          ポート省略時は現在のポートを自動付与します。
        </p>
      </div>

      {/* 警告: localhost のままで lanHost 未入力 */}
      {showLocalhostWarning && (
        <div className="flex items-start gap-2 p-2.5 bg-amber-950/50 border border-amber-700/60 rounded">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            現在の URL は <span className="font-mono">localhost</span>{" "}
            なので、スマホからは開けません。上の入力欄に PC の LAN IP を入れてください。
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="bg-white rounded-md p-2 shrink-0">
          {url ? (
            <QRCodeSVG value={url} size={112} level="M" />
          ) : (
            <div className="w-28 h-28" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="text-[11px] font-mono text-gray-300 break-all bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5">
            {url || "—"}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={copy}>
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                コピーしました
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                URLをコピー
              </>
            )}
          </Button>
        </div>
      </div>

      {/* セットアップ手順 */}
      {helpOpen && (
        <div className="p-3 bg-gray-900/60 border border-gray-700 rounded space-y-2 text-xs text-gray-200 leading-relaxed">
          <div className="font-semibold text-gray-100">スマホで開けない時の手順</div>
          <ol className="list-decimal pl-5 space-y-1.5">
            <li>
              <b>PCとスマホを同じ Wi-Fi</b> に接続(ルーターをまたぐと届きません)。
            </li>
            <li>
              ターミナルで <span className="font-mono">npm run dev</span> 起動時のログを確認:
              <pre className="mt-1 p-2 bg-black/40 rounded font-mono text-[11px] text-gray-300">
                ➜ Local:   http://localhost:5173/{"\n"}
                ➜ Network: http://192.168.11.7:5173/  ← これを使う
              </pre>
              この <span className="font-mono">Network:</span> の IP を上の入力欄に貼ります。
            </li>
            <li>
              Windows の場合、初回は <b>「Windowsセキュリティアラート」</b> が出ます。
              <b>「プライベートネットワーク」</b> にチェックして「アクセスを許可」。
            </li>
            <li>
              それでも開けない時はファイアウォール: コントロールパネル →
              Windows Defender ファイアウォール → 詳細設定 → 受信の規則 →
              <span className="font-mono">Node.js</span> を「許可」。
            </li>
            <li>
              スマホで QR を読み取り(または URL を直接入力) → 接続済み(緑)になれば成功。
            </li>
          </ol>
          <p className="text-[11px] text-gray-500 pt-1">
            ※ Vercel 等にデプロイした本番 URL を使う場合はこの設定不要(そのまま動きます)。
          </p>
        </div>
      )}

      <p className="text-[11px] text-gray-500 leading-relaxed">
        ※ ホットキー(エディタ画面で動くキーボードショートカット)の設定は下の
        「ホットキー設定」セクションから行えます。
      </p>
    </div>
  );
}
