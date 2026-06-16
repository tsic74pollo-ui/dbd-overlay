export type Segment = { text: string; color: string };

export type LineBase = {
  visible: boolean;
  showBackground?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
};

export type TextLine = LineBase & {
  text?: string;
  color?: string;
  segments?: Segment[];
  /** バイリンガル表示用の第二テキスト(EN 翻訳 or サブタイトル等)。空なら従来通り単行表示。
   *  色とサイズ倍率はルーム共通の OverlaySettings.bilingualStyle を参照する。 */
  secondaryText?: string;
};

/** バイリンガル(第二テキスト)表示のルーム共通スタイル。全 TextLine の secondaryText に適用される。 */
export type BilingualStyle = {
  /** 第二テキストの色。既定は半透明の白寄り灰色 */
  color: string;
  /** 主テキストに対するフォントサイズ倍率(0.3 〜 0.9 程度) */
  scale: number;
  /** 主テキストとの行間 em */
  gapEm: number;
};

export type SetEntry = {
  setNumber: number;
  killerName: string;
  playerName: string;
};

/** SET一覧の表示モード。
 * - "auto": 3秒ごとに次のSETへ自動切替（既定。従来動作）
 * - "manual": ホットキー/リモコンで次のSETに切替。currentSetIndex を尊重 */
export type SetsCycleMode = "auto" | "manual";

export type SetsLine = LineBase & {
  text?: string;
  color?: string;
  sets: SetEntry[];
  /** 既定 "auto"。"manual" のときは currentSetIndex を読む */
  cycleMode?: SetsCycleMode;
  /** "manual" 時の現在表示中インデックス。auto 時は無視 */
  currentSetIndex?: number;
};

export type Line = TextLine | SetsLine;

export type Align = "left" | "center" | "right";

// 1920x1080 フレームに対する % (0–100)
export type Rect = { x: number; y: number; width: number; height: number };

// 開始/停止/リセットできるストップウォッチの共通状態
// 経過 = accumulatedMs + (running && startedAt ? now - startedAt : 0)
export type StopwatchState = {
  startedAt: number | null; // epoch ms（稼働中のみ）
  accumulatedMs: number;
  running: boolean;
};

export type PerkCoverFit = "contain" | "cover" | "fill";

// カバーの形状
export type PerkCoverShape = "diamond" | "roundedSquare" | "circle" | "hexagon";

// 開放アニメーション
export type PerkCoverReveal = "fade" | "iris" | "slideDown" | "dissolve" | "flash";

/** 枠グローの表現スタイル(単一選択)。V2から導入。boolean排他の組合せを型レベルで防ぐ。 */
export type PerkCoverGlowStyle =
  | "solid" // 単色グロー(回転なし)。旧 glow-static
  | "neon" // 1色のネオン明滅。旧 neonPulse
  | "rainbow" // 虹色 conic 回転
  | "flow" // 単色 + 白ハイライト回転
  | "audio"; // 音量に反応して脈動

/** "audio" スタイル時の入力・反応設定 */
export type AudioReactiveConfig = {
  /** 入力デバイス ID(undefined ならブラウザ規定) */
  deviceId?: string;
  /** 反応の閾値(0..1)。これ未満は反応しない */
  threshold: number;
  /** ゲイン倍率(0..3)。マイクが小さい人向け */
  gain: number;
  /** 周波数帯。"all" は RMS 全帯域、"bass" は ~200Hz以下、"treble" は ~4kHz以上 */
  band: "all" | "bass" | "treble";
};

export type PerkCoverGlow = {
  enabled: boolean;
  style: PerkCoverGlowStyle;
  colorByTimer: boolean; // 残時間で色変化(灰→黄→赤)。どの style にも乗る直交修飾
  color: string;
  /** 既存スタイル: 回転速度。audio: 反応のなめらかさ(smoothing) */
  speedSec: number;
  /** audio スタイル時のみ参照 */
  audio?: AudioReactiveConfig;

  // ---- Legacy fields(読み取り専用 / 互換のため残置)----
  // 古い JSON / localStorage から読むときに style を推論するためだけに残す。
  // 新規保存ではこれらは書かない(normalizePerkCover で削ぎ落とす)。
  /** @deprecated Use `style` instead */
  neonPulse?: boolean;
  /** @deprecated Use `style` instead */
  rainbow?: boolean;
  /** @deprecated Use `style` instead */
  flow?: boolean;
};

// カウントダウンの表示位置（カバーに対して。下は画面外に切れるため不採用）
export type CountdownPos = "top" | "topLeft" | "left" | "bottomLeft";

export type PerkCoverTimer = StopwatchState & {
  enabled: boolean;
  durationSec: number; // 制限時間（分＋秒入力 → 秒で保持）
  showCountdown: boolean;
  countdownColor: string;
  countdownPos: CountdownPos;
  /** 残り <= urgentBelowSec で警告演出（カウントダウン点滅） */
  urgentPulse?: boolean;
  urgentBelowSec?: number;
};

// 右下のパーク隠しカバー
export type PerkCover = Rect & {
  enabled: boolean;
  image: string | null; // data URL
  fit: PerkCoverFit;
  backgroundColor: string;
  opacity: number; // 0–1（100%で完全に隠れる）
  glow: PerkCoverGlow;
  timer: PerkCoverTimer;
  /** カバーの形 */
  shape?: PerkCoverShape;
  /** 開放アニメーション */
  reveal?: PerkCoverReveal;
  /** 開放アニメーションの所要 ms */
  revealDurationMs?: number;
  /**
   * ホットキー / リモコンで強制開放されたフラグ。
   * タイマー有無にかかわらず即時に reveal アニメを発動させたいときに使う。
   * リビール後 3 秒程度で自動的に false へ戻す(次回利用のため)。
   */
  forceReleased?: boolean;
};

// 左下のマッチタイマー（カウントアップ）
export type MatchTimer = StopwatchState & {
  enabled: boolean;
  x: number; // 位置 %（既定は画面左下）
  y: number;
  color: string;
  fontScale: number;
  label: string;
};

/** 通しタイマー(OBS録画時間記録用)。マッチタイマーと違い、Live/録画終了まで
 *  リセットしない長時間タイマー。後で映像と紐付けて各マッチ開始時刻を逆引きする用途。
 *  形は MatchTimer とほぼ同じだが、独立した position / 色 / ラベルを持つ。 */
export type SessionTimer = StopwatchState & {
  enabled: boolean;
  x: number; // 位置 %（既定は画面右上）
  y: number;
  color: string;
  fontScale: number;
  label: string;
};

export type OverlaySettings = {
  iconImage: string;
  lines: Line[];
  align?: Align;
  perkCover?: PerkCover;
  matchTimer?: MatchTimer;
  sessionTimer?: SessionTimer;
  /** バイリンガル表示の共通スタイル(各 TextLine の secondaryText に適用) */
  bilingualStyle?: BilingualStyle;
};

export type Room = {
  id: string;
  name: string;
  settings: OverlaySettings;
  updatedAt: number;
  /** このルームをアクティブ化したとき切替える OBS のシーン名。空/未設定で OBS 連動オフ。 */
  obsSceneName?: string;
  /** このルームをアクティブ化したときマッチタイマーを 0 にリセットするか。例: マッチ画面に戻る度に新マッチで自動 0 開始したい用途。 */
  resetMatchTimerOnActivate?: boolean;
};

/** OBS WebSocket 連携(アプリ全体設定。ルームごとではない)。 */
export type ObsConfig = {
  enabled: boolean;
  url: string; // 例: ws://127.0.0.1:4455
  password: string;
};

export type AppPersistedState = {
  rooms: Room[];
  activeRoomId: string;
  apiKey: string | null;
  obs: ObsConfig;
};

export const isSetsLine = (line: Line): line is SetsLine =>
  Array.isArray((line as SetsLine).sets);
