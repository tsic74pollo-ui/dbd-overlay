import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ApiKeySetup({ open, onOpenChange }: Props) {
  const apiKey = useAppStore((s) => s.apiKey);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const [draft, setDraft] = useState(apiKey ?? "");

  const save = () => {
    setApiKey(draft.trim() ? draft.trim() : null);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-900 border border-gray-700 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-white">
              Claude API キー設定
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="text-sm text-gray-300 space-y-2">
            <p>AI チャット編集を使うには Claude API キーが必要です。</p>
            <p className="text-xs text-gray-400">
              キーは端末の localStorage に保存されます。共有 PC では入力しないでください。
              <br />
              取得:{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline"
              >
                console.anthropic.com/settings/keys
              </a>
            </p>
          </Dialog.Description>
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full h-9 rounded border border-gray-600 bg-gray-800 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button onClick={save}>保存</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
