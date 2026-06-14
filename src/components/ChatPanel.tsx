import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { Button } from "@/components/ui/Button";
import { applyInstruction } from "@/lib/claudeChat";

type Message = { role: "user" | "assistant" | "error"; text: string };

export function ChatPanel({ onOpenApiKey }: { onOpenApiKey: () => void }) {
  const apiKey = useAppStore((s) => s.apiKey);
  const room = useAppStore(selectActiveRoom);
  const update = useAppStore((s) => s.updateActiveRoomSettings);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const text = input.trim();
    if (!text || !room) return;
    if (!apiKey) {
      onOpenApiKey();
      return;
    }
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const next = await applyInstruction(room.settings, text, apiKey);
      update(() => next);
      setMessages((m) => [...m, { role: "assistant", text: "✓ 設定を更新しました" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [...m, { role: "error", text: `エラー: ${msg}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900/90 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-white">AIチャット編集</span>
        <span className="text-xs text-gray-400">
          例: 「Titleを『練習会』に変更、赤に」「SET3 を追加して Killer は Blight」
        </span>
      </div>

      {messages.length > 0 && (
        <div className="max-h-32 overflow-y-auto space-y-1 mb-2 text-sm">
          {messages.slice(-6).map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "text-gray-300"
                  : m.role === "assistant"
                    ? "text-emerald-400"
                    : "text-red-400"
              }
            >
              {m.role === "user" ? "▶ " : ""}
              {m.text}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={apiKey ? "指示を入力..." : "Claude API キーを設定してください..."}
          disabled={busy}
          className="flex-1 h-9 rounded border border-gray-600 bg-gray-700 px-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <Button onClick={submit} disabled={busy || !input.trim()}>
          <Send className="w-4 h-4" />
          {busy ? "処理中" : "送信"}
        </Button>
      </div>
    </div>
  );
}
