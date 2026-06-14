import { useEffect, useState } from "react";

/**
 * ホットキー押下直後に画面右下に 1.2秒だけ出る視覚フィードバック。
 * 編集側にだけ表示する(オーバーレイ画面には絶対に出さない)。
 * design.md §6: 状態変化時のみ動く / smooth start-end / 短く控えめに。
 */
export function HotkeyToast({ message }: { message: string | null }) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    setShown(message);
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, [message]);

  if (!shown) return null;

  return (
    <div
      className={`pointer-events-none fixed bottom-6 right-6 z-50 transition-all duration-150 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      aria-live="polite"
    >
      <div className="rounded-xl bg-zinc-900/85 backdrop-blur-md border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-100 shadow-lg shadow-black/30">
        {shown}
      </div>
    </div>
  );
}
