import { useCallback, useEffect, useState } from "react";
import { HOTKEY_ACTIONS, type HotkeyAction, type RemoteCommand } from "@/lib/hotkeyActions";

export type HotkeyMod = "shift" | "ctrl" | "alt";

export type HotkeyOverride = {
  key: string;
  mods?: HotkeyMod[];
};

export type HotkeyOverrideMap = Partial<Record<RemoteCommand, HotkeyOverride>>;

const STORAGE_KEY = "dbd-overlay:hotkey-overrides:v1";

const readOverrides = (): HotkeyOverrideMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HotkeyOverrideMap) : {};
  } catch {
    return {};
  }
};

const writeOverrides = (m: HotkeyOverrideMap) => {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(m).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
    }
  } catch {
    /* ignore */
  }
};

const sameMods = (a?: HotkeyMod[], b?: HotkeyMod[]) => {
  const av = new Set(a ?? []);
  const bv = new Set(b ?? []);
  if (av.size !== bv.size) return false;
  for (const x of av) if (!bv.has(x)) return false;
  return true;
};

const sameKey = (a: HotkeyOverride, b: HotkeyOverride) =>
  a.key.toLowerCase() === b.key.toLowerCase() && sameMods(a.mods, b.mods);

/**
 * HOTKEY_ACTIONS の default キーに対し、localStorage の override を被せた
 * 「実効ホットキーテーブル」を返す。EditorPage の useHotkeys に渡す前提。
 *
 *  - setOverride(id, override) で個別変更
 *  - resetAll() で全消し → default 復帰
 *  - hasConflict(id, key, mods) で別アクションとの重複を判定
 */
export function useEffectiveHotkeys() {
  const [overrides, setOverrides] = useState<HotkeyOverrideMap>(() =>
    readOverrides(),
  );

  // 別タブで storage が変わったら追従
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setOverrides(readOverrides());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const effective: HotkeyAction[] = HOTKEY_ACTIONS.map((a) => {
    const ov = overrides[a.id];
    return ov ? { ...a, key: ov.key, mods: ov.mods } : a;
  });

  const setOverride = useCallback(
    (id: RemoteCommand, ov: HotkeyOverride | null) => {
      setOverrides((prev) => {
        const next = { ...prev };
        if (ov === null) {
          delete next[id];
        } else {
          next[id] = { key: ov.key, mods: ov.mods };
        }
        writeOverrides(next);
        return next;
      });
    },
    [],
  );

  const resetAll = useCallback(() => {
    setOverrides({});
    writeOverrides({});
  }, []);

  const hasConflict = useCallback(
    (id: RemoteCommand, key: string, mods?: HotkeyMod[]) => {
      const probe: HotkeyOverride = { key, mods };
      for (const a of effective) {
        if (a.id === id) continue;
        if (sameKey({ key: a.key, mods: a.mods }, probe)) return true;
      }
      return false;
    },
    [effective],
  );

  return { effective, overrides, setOverride, resetAll, hasConflict };
}
