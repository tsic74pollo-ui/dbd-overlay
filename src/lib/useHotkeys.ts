import { useEffect, useRef } from "react";

export type HotkeyBinding = {
  /** KeyboardEvent.key 想定。"t" や "ArrowRight" 等。大文字小文字は無視。 */
  key: string;
  /** 修飾キー(指定したものが ALL 押されている必要あり) */
  mods?: ("shift" | "ctrl" | "alt")[];
  /** ハンドラ */
  action: () => void;
};

/**
 * 入力中(input/textarea/contenteditable)かつIME変換中は横取りしない。
 * これで「タイトル編集中に T を打ったらタイマーが動いてしまう」事故を防ぐ。
 */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

function matchMods(e: KeyboardEvent, mods?: HotkeyBinding["mods"]): boolean {
  const want = new Set(mods ?? []);
  if (want.has("shift") !== e.shiftKey) return false;
  if (want.has("ctrl") !== (e.ctrlKey || e.metaKey)) return false;
  if (want.has("alt") !== e.altKey) return false;
  return true;
}

/**
 * window 全体に keydown リスナーを張ってホットキーをディスパッチする。
 * bindings は再レンダーで配列インスタンスが変わっても OK(ref で最新版を参照)。
 */
export function useHotkeys(bindings: HotkeyBinding[]): void {
  const ref = useRef(bindings);
  ref.current = bindings;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // IME 変換中は無視(キーボードは IME を確定する目的で叩かれている)
      if (e.isComposing || e.keyCode === 229) return;
      if (isEditableTarget(e.target)) return;

      const k = e.key.toLowerCase();
      for (const b of ref.current) {
        if (k !== b.key.toLowerCase()) continue;
        if (!matchMods(e, b.mods)) continue;
        e.preventDefault();
        b.action();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
