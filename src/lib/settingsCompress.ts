import type {
  BilingualStyle,
  LottieAnimation,
  MatchLogWidget,
  MatchTimer,
  OverlaySettings,
  PerkCover,
  PerkCoverGlow,
  PerkCoverTimer,
  SessionTimer,
} from "./types";
import {
  defaultBilingualStyle,
  defaultLottie,
  defaultMatchLog,
  defaultMatchTimer,
  defaultPerkCover,
  defaultSessionTimer,
  normalizeBilingualStyle,
  normalizeLottie,
  normalizeMatchLog,
  normalizeMatchTimer,
  normalizePerkCover,
  normalizeSessionTimer,
} from "./defaults";

/**
 * Tier 1 egress reduction #4 — broadcast 直前に「デフォルト値と同一のフィールド」を
 * 取り除き、receive 側で normalize しなおす。Scene JSON が 40-60% 圧縮される。
 *
 * 設計原則:
 *  - **安全方向にミス**: 「等価判定」が失敗してもフィールドが残るだけ。情報欠落しない。
 *  - **キー欠落 → デフォルト**: receive 側は `normalizePerkCover` / `normalizeMatchTimer`
 *    を必ず通してから setRoomSettings する(下流の `useRoomsSync` で既に通っている)。
 *  - **配列/imageは触らない**: lines や image(dataURL) は形が複雑なのでそのまま送る。
 */

/** プリミティブの厳密一致 */
const eq = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9;
  }
  return false;
};

/**
 * 入れ子オブジェクトから「parent のキーと等しい値」を削除した shallow copy を返す。
 * 配列/null/未定義は触らない。サブオブジェクトは再帰的に圧縮し、空 `{}` になったら捨てる。
 */
const stripObject = <T extends object>(value: T, defaults: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(value) as Array<keyof T>) {
    const v = value[k] as unknown;
    const d = defaults[k] as unknown;
    if (v === undefined) continue;
    if (Array.isArray(v) || v instanceof Date) {
      out[k as string] = v;
      continue;
    }
    if (v !== null && typeof v === "object" && d !== null && typeof d === "object" && !Array.isArray(d)) {
      const sub = stripObject(v as object, d as object);
      if (Object.keys(sub).length > 0) out[k as string] = sub;
      continue;
    }
    if (!eq(v, d)) out[k as string] = v;
  }
  return out as Partial<T>;
};

const compressPerkCover = (pc: PerkCover): Partial<PerkCover> => {
  const d = defaultPerkCover();
  // legacy boolean は absent でOK(normalize が style から復元する)
  const cleanGlow: PerkCoverGlow = { ...pc.glow };
  delete (cleanGlow as Partial<PerkCoverGlow>).neonPulse;
  delete (cleanGlow as Partial<PerkCoverGlow>).rainbow;
  delete (cleanGlow as Partial<PerkCoverGlow>).flow;
  const cleaned: PerkCover = { ...pc, glow: cleanGlow };
  return stripObject(cleaned, d);
};

const compressMatchTimer = (mt: MatchTimer): Partial<MatchTimer> => {
  return stripObject(mt, defaultMatchTimer());
};

const compressSessionTimer = (st: SessionTimer): Partial<SessionTimer> => {
  return stripObject(st, defaultSessionTimer());
};

export const compressSettings = (
  s: OverlaySettings,
): Partial<OverlaySettings> => {
  const out: Partial<OverlaySettings> = {};
  // 必須・複雑な構造体はそのまま
  out.iconImage = s.iconImage;
  out.lines = s.lines;
  if (s.align && s.align !== "left") out.align = s.align;
  if (s.perkCover) {
    const c = compressPerkCover(s.perkCover);
    if (Object.keys(c).length > 0) out.perkCover = c as PerkCover;
  }
  if (s.matchTimer) {
    const c = compressMatchTimer(s.matchTimer);
    if (Object.keys(c).length > 0) out.matchTimer = c as MatchTimer;
  }
  if (s.sessionTimer) {
    const c = compressSessionTimer(s.sessionTimer);
    if (Object.keys(c).length > 0) out.sessionTimer = c as SessionTimer;
  }
  if (s.bilingualStyle) {
    const c = stripObject(s.bilingualStyle, defaultBilingualStyle());
    if (Object.keys(c).length > 0) out.bilingualStyle = c as BilingualStyle;
  }
  if (s.matchLog) {
    // records 配列はそのまま、その他フィールドは default 比較で剥ぐ
    const c = stripObject(s.matchLog, defaultMatchLog());
    if (Object.keys(c).length > 0) out.matchLog = c as MatchLogWidget;
  }
  if (s.lottie) {
    // json は大きいが配列ではないので stripObject の通常パスで透過送信される
    const c = stripObject(s.lottie, defaultLottie());
    if (Object.keys(c).length > 0) out.lottie = c as LottieAnimation;
  }
  return out;
};

export const decompressSettings = (
  s: Partial<OverlaySettings>,
): OverlaySettings => {
  return {
    iconImage: s.iconImage ?? "",
    lines: s.lines ?? [],
    align: s.align ?? "left",
    perkCover: s.perkCover
      ? normalizePerkCover(s.perkCover as Partial<PerkCover>)
      : undefined,
    matchTimer: s.matchTimer
      ? normalizeMatchTimer(s.matchTimer as Partial<MatchTimer>)
      : undefined,
    sessionTimer: s.sessionTimer
      ? normalizeSessionTimer(s.sessionTimer as Partial<SessionTimer>)
      : undefined,
    bilingualStyle: s.bilingualStyle
      ? normalizeBilingualStyle(s.bilingualStyle as Partial<BilingualStyle>)
      : undefined,
    matchLog: s.matchLog
      ? normalizeMatchLog(s.matchLog as Partial<MatchLogWidget>)
      : undefined,
    lottie: s.lottie
      ? normalizeLottie(s.lottie as Partial<LottieAnimation>)
      : undefined,
  };
};

// Tier1 で参照されない export を抑制(型を一意にしておく為のみ)
export type { PerkCoverTimer };
