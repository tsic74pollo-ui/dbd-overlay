import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Timer, Eye, ArrowRight, Wifi, WifiOff } from "lucide-react";
import {
  joinCommandChannel,
  type CommandHandle,
  type CommandStatus,
} from "@/lib/realtimeCommand";
import { joinRoom } from "@/lib/realtimeSync";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { OverlaySettings } from "@/lib/types";
import { HOTKEY_ACTIONS } from "@/lib/hotkeyActions";
import { cn } from "@/lib/cn";

/**
 * /remote?r=<roomId> — スマホ / サブモニターから操作するための軽量画面。
 * 巨大ボタン3つだけ。設計は design.md §1 One Clear Focus / §7 Hover Feels Alive。
 */

const STATUS_LABEL: Record<CommandStatus, string> = {
  connecting: "接続中…",
  live: "接続済み",
  offline: "切断",
  error: "エラー",
  idle: "待機",
};

const STATUS_COLOR: Record<CommandStatus, string> = {
  connecting: "text-amber-300",
  live: "text-emerald-300",
  offline: "text-zinc-400",
  error: "text-red-300",
  idle: "text-zinc-500",
};

export function RemotePage() {
  const [params] = useSearchParams();
  const roomId = params.get("r");

  const [status, setStatus] = useState<CommandStatus>("idle");
  const [settings, setSettings] = useState<OverlaySettings | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const cmdRef = useRef<CommandHandle | null>(null);

  // モバイル: viewportを固定 / ホイールスクロール禁止で快適に
  useEffect(() => {
    document.body.classList.add("remote-route");
    return () => document.body.classList.remove("remote-route");
  }, []);

  useEffect(() => {
    if (!roomId) return;
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }

    const cmd = joinCommandChannel(roomId, "remote", {
      onStatus: setStatus,
    });
    cmdRef.current = cmd;

    // ルームの最新 settings を表示用に購読(タイマー状態の参考表示)
    const state = joinRoom(roomId, "viewer", {
      onState: setSettings,
      onStatus: () => undefined,
    });

    return () => {
      cmd?.unsubscribe();
      state?.unsubscribe();
      cmdRef.current = null;
    };
  }, [roomId]);

  const send = (kind: (typeof HOTKEY_ACTIONS)[number]["id"]) => {
    if (!cmdRef.current) return;
    cmdRef.current.send(kind);
    setPressed(kind);
    window.setTimeout(() => setPressed(null), 220);
    // 触覚フィードバック(対応端末のみ)
    if ("vibrate" in navigator) navigator.vibrate?.(15);
  };

  const timerLabel = useMemo(() => {
    const mt = settings?.matchTimer;
    if (!mt) return "Match Timer";
    return mt.running ? "⏸ タイマー停止" : "▶ タイマー開始";
  }, [settings]);

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-300 px-6 text-center">
        <div>
          <h1 className="text-lg font-semibold mb-2">URL に <code>?r=&lt;roomId&gt;</code> がありません</h1>
          <p className="text-sm text-zinc-500">
            設定パネルの「リモコン端末」セクションからURLをコピーしてください。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ヘッダー: 接続状態 */}
      <header className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-zinc-900/60 backdrop-blur-sm">
        <span className={cn("flex items-center gap-1.5 text-xs font-mono", STATUS_COLOR[status])}>
          {status === "live" ? <Wifi size={14} /> : <WifiOff size={14} />}
          {STATUS_LABEL[status]}
        </span>
        <span className="text-xs text-zinc-500 ml-auto font-mono">
          room:<span className="ml-1 text-zinc-300">{roomId.slice(0, 8)}…</span>
        </span>
      </header>

      {/* 巨大ボタン3つ。それぞれ画面の約30% */}
      <div className="flex-1 flex flex-col gap-3 p-4">
        <BigButton
          accent="amber"
          icon={<Timer size={36} />}
          label={timerLabel}
          sub="マッチタイマー"
          pressed={pressed === "timer.toggle"}
          onClick={() => send("timer.toggle")}
        />
        <BigButton
          accent="emerald"
          icon={<Eye size={36} />}
          label="カバー開放"
          sub="パーク隠しを即開く"
          pressed={pressed === "perkCover.release"}
          onClick={() => send("perkCover.release")}
        />
        <BigButton
          accent="sky"
          icon={<ArrowRight size={36} />}
          label="次のルームへ"
          sub={settings ? "OBSシーンも自動切替" : "ホストに接続中"}
          pressed={pressed === "room.next"}
          onClick={() => send("room.next")}
        />
      </div>

      <footer className="px-5 py-3 text-[11px] text-zinc-500 text-center font-mono border-t border-white/5">
        FrameSync Remote · 接続が切れたら自動で再接続を試みます
      </footer>
    </main>
  );
}

function BigButton({
  accent,
  icon,
  label,
  sub,
  pressed,
  onClick,
}: {
  accent: "amber" | "emerald" | "sky";
  icon: React.ReactNode;
  label: string;
  sub: string;
  pressed: boolean;
  onClick: () => void;
}) {
  const palette = {
    amber: {
      base: "bg-amber-600 hover:bg-amber-500 border-amber-500/40 shadow-amber-500/15",
      pressed: "bg-amber-400",
    },
    emerald: {
      base: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40 shadow-emerald-500/15",
      pressed: "bg-emerald-400",
    },
    sky: {
      base: "bg-sky-600 hover:bg-sky-500 border-sky-500/40 shadow-sky-500/15",
      pressed: "bg-sky-400",
    },
  }[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-h-[5.5rem] rounded-2xl border text-white",
        "transition-all duration-150 ease-out",
        "shadow-lg active:scale-[0.98]",
        "flex items-center gap-4 px-6 text-left",
        pressed ? palette.pressed : palette.base,
      )}
    >
      <div className="shrink-0 opacity-95">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold tracking-tight">{label}</div>
        <div className="text-sm opacity-80 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}
