import type { OverlaySettings, Line } from "./types";
import { defaultSettings } from "./defaults";

const LEGACY_KEY = "game-overlay-settings";

export function tryLoadLegacy(): OverlaySettings | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { iconImage?: string; lines?: Line[] };
    if (!parsed.lines || !Array.isArray(parsed.lines)) return null;
    const base = defaultSettings();
    return {
      iconImage: parsed.iconImage || base.iconImage,
      lines: parsed.lines as Line[],
    };
  } catch {
    return null;
  }
}
