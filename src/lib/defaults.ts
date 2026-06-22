import type {
  BilingualStyle,
  ChaseDiagnosticConfig,
  ChaseRoi,
  Line,
  LottieAnimation,
  MatchLogWidget,
  MatchTimer,
  ObsConfig,
  OverlaySettings,
  PerkCover,
  PerkCoverGlow,
  PerkCoverGlowStyle,
  Room,
  SessionTimer,
} from "./types";

// =============================================================================
// User-saved defaults
// =============================================================================
// 新規ルームを作るときに使われる「位置・サイズの基本値」を、ユーザーが現在
// 使っている値で上書きできるようにする。各エディタの「デフォルトに保存」
// ボタンから呼ばれる。LocalStorage に独立して保存し、ストア本体とは分離。

const USER_DEFAULTS_KEY = "dbd-overlay:user-defaults:v1";

type PerkCoverRect = { x: number; y: number; width: number; height: number };
type MatchTimerPos = { x: number; y: number };
type SessionTimerPos = { x: number; y: number };

type UserDefaults = {
  perkCoverRect?: PerkCoverRect;
  matchTimerPos?: MatchTimerPos;
  sessionTimerPos?: SessionTimerPos;
};

const readUserDefaults = (): UserDefaults => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_DEFAULTS_KEY);
    return raw ? (JSON.parse(raw) as UserDefaults) : {};
  } catch {
    return {};
  }
};

const writeUserDefaults = (next: UserDefaults): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_DEFAULTS_KEY, JSON.stringify(next));
  } catch {
    /* storage may be full / disabled — silently fall back to hardcoded defaults */
  }
};

export const saveUserDefaultPerkCoverRect = (rect: PerkCoverRect): void => {
  writeUserDefaults({ ...readUserDefaults(), perkCoverRect: rect });
};

export const saveUserDefaultMatchTimerPos = (pos: MatchTimerPos): void => {
  writeUserDefaults({ ...readUserDefaults(), matchTimerPos: pos });
};

export const saveUserDefaultSessionTimerPos = (pos: SessionTimerPos): void => {
  writeUserDefaults({ ...readUserDefaults(), sessionTimerPos: pos });
};

export const clearUserDefaults = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_DEFAULTS_KEY);
  } catch {
    /* ignore */
  }
};


export const PRESET_ICONS = [
  "/icons/icon-1.png",
  "/icons/icon-2.png",
  "/icons/icon-3.png",
  "/icons/icon-4.png",
  "/icons/icon-5.png",
  "/icons/icon-6.png",
];

export const LINE_LABELS = [
  "1段目",
  "2段目",
  "3段目",
  "4段目",
  "5段目",
  "SET一覧",
];

const defaultLines = (): Line[] => [
  { text: "Ladder", color: "#FFFFFF", visible: true, showBackground: false, backgroundOpacity: 1 },
  { text: "Title", color: "#FFFFFF", visible: true, showBackground: false, backgroundOpacity: 1 },
  { text: "Scrims", color: "#00BFFF", visible: true, backgroundColor: "#2D2D2D", showBackground: true, backgroundOpacity: 1 },
  { text: "VS", color: "#FF4444", visible: true, backgroundColor: "#2D2D2D", showBackground: true, backgroundOpacity: 1 },
  { text: "RULESET", color: "#FFFFFF", visible: true, backgroundColor: "#2D2D2D", showBackground: true, backgroundOpacity: 1 },
  {
    text: "",
    color: "#FFFFFF",
    visible: true,
    backgroundColor: "#2D2D2D",
    showBackground: true,
    backgroundOpacity: 1,
    sets: [
      { setNumber: 1, killerName: "The Plague", playerName: "Player Name" },
      { setNumber: 2, killerName: "The Dark Lord", playerName: "Player Name" },
      { setNumber: 3, killerName: "The Unknown", playerName: "Player Name" },
    ],
  },
];

// パーク隠しカバー（右下）。既定は 1920x1080 / HUD80% の実測値、グローはオン・タイマーは未開始。
// ユーザーが「現在の値をデフォルトに保存」している場合はそちらが優先される。
export const defaultPerkCover = (): PerkCover => {
  const ud = readUserDefaults();
  const r = ud.perkCoverRect;
  return {
  enabled: false,
  image: null,
  fit: "contain",
  backgroundColor: "#0d0d0f",
  opacity: 0.92,
  x: r?.x ?? 88.5,
  y: r?.y ?? 79,
  width: r?.width ?? 10.5,
  height: r?.height ?? 19,
  shape: "diamond",
  reveal: "fade",
  revealDurationMs: 600,
  glow: {
    enabled: true,
    style: "neon",
    colorByTimer: true,
    color: "#00BFFF",
    speedSec: 3,
    audio: {
      threshold: 0.08,
      gain: 1.5,
      band: "all",
    },
  },
  timer: {
    enabled: true,
    durationSec: 60,
    showCountdown: true,
    countdownColor: "#FFFFFF",
    countdownPos: "top",
    startedAt: null,
    accumulatedMs: 0,
    running: false,
    urgentPulse: true,
    urgentBelowSec: 10,
  },
  forceReleased: false,
  };
};

// マッチタイマー（左下・カウントアップ）。
// ユーザーが「現在の値をデフォルトに保存」している場合はそちらが優先される。
export const defaultMatchTimer = (): MatchTimer => {
  const ud = readUserDefaults();
  const p = ud.matchTimerPos;
  return {
    enabled: false,
    x: p?.x ?? 3,
    y: p?.y ?? 88,
    color: "#FFFFFF",
    fontScale: 1.2,
    label: "MATCH TIME",
    startedAt: null,
    accumulatedMs: 0,
    running: false,
  };
};

// 通しタイマー（OBS録画通し時間・既定は右上・カウントアップ）。
export const defaultSessionTimer = (): SessionTimer => {
  const ud = readUserDefaults();
  const p = ud.sessionTimerPos;
  return {
    enabled: false,
    x: p?.x ?? 82,
    y: p?.y ?? 2,
    color: "#FFB347",
    fontScale: 0.9,
    label: "REC",
    startedAt: null,
    accumulatedMs: 0,
    running: false,
  };
};

// 既存の保存データ/同期データに新フィールドが無くてもデフォルトで埋める（後方互換）。
/**
 * 旧 boolean(neonPulse/rainbow/flow) から新 style を推論する。
 * 優先順位: rainbow > flow > neonPulse > "solid"。
 * style が既に入っていればそれをそのまま尊重する。
 */
const inferGlowStyle = (
  g: Partial<PerkCoverGlow> | undefined,
): PerkCoverGlowStyle => {
  if (!g) return "neon";
  if (g.style) return g.style;
  if (g.rainbow) return "rainbow";
  if (g.flow) return "flow";
  if (g.neonPulse) return "neon";
  return "solid";
};

export const normalizePerkCover = (pc?: Partial<PerkCover>): PerkCover => {
  const d = defaultPerkCover();
  if (!pc) return d;
  const inGlow = pc.glow as Partial<PerkCoverGlow> | undefined;
  const mergedGlow: PerkCoverGlow = {
    ...d.glow,
    ...inGlow,
    style: inferGlowStyle(inGlow),
    audio: { ...d.glow.audio!, ...(inGlow?.audio ?? {}) },
  };
  // legacy boolean は読み取り後は削ぎ落とす(再書き出し時に冗長にしない)
  delete (mergedGlow as Partial<PerkCoverGlow>).neonPulse;
  delete (mergedGlow as Partial<PerkCoverGlow>).rainbow;
  delete (mergedGlow as Partial<PerkCoverGlow>).flow;
  return {
    ...d,
    ...pc,
    glow: mergedGlow,
    timer: { ...d.timer, ...pc.timer },
    forceReleased: pc.forceReleased ?? false,
  };
};

export const normalizeMatchTimer = (mt?: Partial<MatchTimer>): MatchTimer => ({
  ...defaultMatchTimer(),
  ...mt,
});

export const normalizeSessionTimer = (st?: Partial<SessionTimer>): SessionTimer => ({
  ...defaultSessionTimer(),
  ...st,
});

// バイリンガル表示の共通スタイル既定値。主テキストより小さく薄く控えめに。
export const defaultBilingualStyle = (): BilingualStyle => ({
  color: "rgba(255,255,255,0.62)",
  scale: 0.55,
  gapEm: 0.05,
});

export const normalizeBilingualStyle = (bs?: Partial<BilingualStyle>): BilingualStyle => ({
  ...defaultBilingualStyle(),
  ...bs,
});

// マッチログウィジェット(今日のスクリム結果)既定値。既定位置は右側余白。
export const defaultMatchLog = (): MatchLogWidget => ({
  enabled: false,
  x: 72,
  y: 14,
  width: 26,
  fontScale: 0.78,
  bgColor: "#0d0d0f",
  bgOpacity: 0.55,
  titleText: "TODAY'S SCRIM",
  maxVisibleRows: 8,
  showCurrentMatchHighlight: true,
  records: [],
  currentMatchNo: null,
  currentStartedAtSec: null,
});

/** 旧スキーマ(player/result/isWin) の記録を新スキーマ(note/kills/stages/isPowered) に変換する。
 *  既に新スキーマなら何もしない。 */
const migrateMatchRecord = (
  rec: Partial<MatchLogWidget["records"][number]> & {
    player?: string;
    result?: string;
    isWin?: boolean;
  },
): MatchLogWidget["records"][number] => {
  // 既に新スキーマかチェック
  if (typeof rec.kills === "number" && typeof rec.isPowered === "boolean") {
    return rec as MatchLogWidget["records"][number];
  }
  // 旧 → 新マイグレーション
  const oldResult = (rec.result ?? "").toString();
  // "4K" "3K" 等から数字を拾う
  const km = oldResult.match(/(\d)\s*K/i);
  const kills = km ? Math.min(4, Math.max(0, parseInt(km[1], 10))) : 0;
  const isWin = rec.isWin === true;
  return {
    matchNo: rec.matchNo ?? 0,
    startedAtSec: rec.startedAtSec ?? 0,
    endedAtSec: rec.endedAtSec ?? 0,
    killer: rec.killer ?? "",
    note: rec.note ?? rec.player ?? "",
    kills,
    stages: 0,
    isPowered: isWin,
    gensRemaining: undefined,
  };
};

export const normalizeMatchLog = (m?: Partial<MatchLogWidget>): MatchLogWidget => {
  const d = defaultMatchLog();
  return {
    ...d,
    ...m,
    // records は配列。旧スキーマ(player/result/isWin) があればその場でマイグレーション
    records: Array.isArray(m?.records)
      ? (m!.records as Array<Partial<MatchLogWidget["records"][number]>>).map(migrateMatchRecord)
      : d.records,
  };
};

// Lottie アニメーション既定値。enabled: false で未設定状態。
export const defaultLottie = (): LottieAnimation => ({
  enabled: false,
  json: "",
  name: "",
  trigger: "room-activate",
  x: 35,
  y: 30,
  width: 30,
  loop: false,
  fadeOutMs: 600,
});

export const normalizeLottie = (l?: Partial<LottieAnimation>): LottieAnimation => ({
  ...defaultLottie(),
  ...l,
});

// チェイス検知 ROI の 1080p 既定プリセット(目視測定値)
// ポートレート右隣の「||」 マーク出現エリアを 50x30px で囲む。HUD 100% 想定。
// 解像度や HUD スケールが違う場合はユーザーが ChaseDiagnosticPanel で微調整。
export const PRESET_CHASE_ROIS_1080P: [ChaseRoi, ChaseRoi, ChaseRoi, ChaseRoi] = [
  { x: 165, y: 458, width: 50, height: 30 }, // [0] あああ
  { x: 165, y: 548, width: 50, height: 30 }, // [1] 佐々木のあ
  { x: 165, y: 638, width: 50, height: 30 }, // [2] riko
  { x: 165, y: 728, width: 50, height: 30 }, // [3] Nakumo_GGs
];

export const defaultChaseDiagnostic = (): ChaseDiagnosticConfig => ({
  enabled: false,
  obsSourceName: "",
  pollingFps: 8,
  yellowFilter: true,
  rois: [
    { ...PRESET_CHASE_ROIS_1080P[0] },
    { ...PRESET_CHASE_ROIS_1080P[1] },
    { ...PRESET_CHASE_ROIS_1080P[2] },
    { ...PRESET_CHASE_ROIS_1080P[3] },
  ],
  survivorNames: ["P1", "P2", "P3", "P4"],
  showLiveBars: true,
});

export const normalizeChaseDiagnostic = (
  c?: Partial<ChaseDiagnosticConfig>,
): ChaseDiagnosticConfig => {
  const d = defaultChaseDiagnostic();
  if (!c) return d;
  // rois と survivorNames は固定 4 要素の配列なので明示マージ
  const rois = (Array.isArray(c.rois) && c.rois.length === 4
    ? c.rois
    : d.rois) as ChaseDiagnosticConfig["rois"];
  const survivorNames = (Array.isArray(c.survivorNames) && c.survivorNames.length === 4
    ? c.survivorNames
    : d.survivorNames) as ChaseDiagnosticConfig["survivorNames"];
  return {
    ...d,
    ...c,
    rois,
    survivorNames,
  };
};

// 解像度 / HUDスケール プリセット（実測ベース。右下パーク2×2）。
export const PERK_COVER_PRESETS: { key: string; label: string; rect: { x: number; y: number; width: number; height: number } }[] = [
  { key: "1080p-80", label: "1080p / HUD 80%", rect: { x: 88.5, y: 79, width: 10.5, height: 19 } },
  { key: "1080p-100", label: "1080p / HUD 100%", rect: { x: 86, y: 74, width: 13, height: 24 } },
];

export const defaultSettings = (): OverlaySettings => ({
  iconImage: PRESET_ICONS[0],
  lines: defaultLines(),
  perkCover: defaultPerkCover(),
  matchTimer: defaultMatchTimer(),
  sessionTimer: defaultSessionTimer(),
  bilingualStyle: defaultBilingualStyle(),
  matchLog: defaultMatchLog(),
  chaseDiagnostic: defaultChaseDiagnostic(),
});

export const newRoom = (name = "新しいルーム"): Room => ({
  id: crypto.randomUUID(),
  name,
  settings: defaultSettings(),
  updatedAt: Date.now(),
});

/** OBS 連携設定の既定値。url は OBS Studio 28+ の標準値。 */
export const defaultObsConfig = (): ObsConfig => ({
  enabled: false,
  url: "ws://127.0.0.1:4455",
  password: "",
});
