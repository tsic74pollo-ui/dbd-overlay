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

/** 1 マッチ分の記録(マッチログウィジェット表示用)。
 *
 * 表示構造: M{No} {killer} {note}  {K/S}  {✓ or G残}
 *
 * 入力ルール:
 *   - killer: 現在の SET から自動取得(編集時オーバーライド可)
 *   - note: 完全フリーワード(マップ名/プレイ評価/メモ等、入力例 "Dead Dawg Saloon Killer Pick")
 *   - 通電 (isPowered) = true: K/S 入力有効、G 非表示、行末 ✓
 *   - 通電 = false かつ gensRemaining が入力されたら全滅(4K12S)が確定するため K/S 入力は無効化、G 残数(1-5) を行末に表示
 */
export type MatchResult = {
  /** 表示用の連番(M1, M2 ...) */
  matchNo: number;
  /** 通しタイマー REC の経過秒(マッチ開始時)。映像の頭出し用 */
  startedAtSec: number;
  /** REC 経過秒(マッチ終了/記録時) */
  endedAtSec: number;
  /** Killer 名(現在の SET から自動入力。手動オーバーライド可) */
  killer: string;
  /** フリーワード欄(マップ名/メモ/プレイ評価など)。手動入力のみ */
  note: string;
  /** キル数 0-4 (通電時のみ意味あり。全滅時は表示上 4 固定) */
  kills: number;
  /** ステージ数 0-12 (通電時のみ意味あり。全滅時は表示上 12 固定) */
  stages: number;
  /** 通電(発電機全完了)。true: ✓ マーク + K/S 表示、false: 4K12S 固定 + G 残表示 */
  isPowered: boolean;
  /** 全滅時の発電機残数 1-5。isPowered=false かつ入力された場合のみ意味あり */
  gensRemaining?: number;
};

/** 今日のスクリム結果ウィジェット。右側余白に縦積み表示。 */
export type MatchLogWidget = {
  enabled: boolean;
  /** 配置 % */
  x: number;
  y: number;
  /** 横幅 % */
  width: number;
  /** 文字サイズ倍率 */
  fontScale: number;
  /** 背景色(#hex) */
  bgColor: string;
  /** 背景不透明度 0..1 */
  bgOpacity: number;
  /** 見出しテキスト。空なら見出し非表示 */
  titleText: string;
  /** 最大表示行数(超えると古い順にフェード/折りたたみ) */
  maxVisibleRows: number;
  /** 進行中マッチをハイライト表示するか */
  showCurrentMatchHighlight: boolean;
  /** 蓄積された全マッチ結果(最後尾が最新) */
  records: MatchResult[];
  /** 現在進行中のマッチ番号(未開始時は null) */
  currentMatchNo: number | null;
  /** 現在マッチの開始 REC 経過秒(未開始 null) */
  currentStartedAtSec: number | null;
};

/** Lottie アニメーションの発火タイミング。 */
export type LottieTrigger =
  /** このルームが activate した瞬間(ルーム切替) */
  | "room-activate"
  /** マッチタイマー開始時(idle → running 遷移) */
  | "match-start"
  /** SET 切替時(currentSetIndex の変化 or auto モードの自動切替) */
  | "set-change";

/** ルームに紐付ける Lottie アニメーション設定。
 *  text-to-lottie Skill 等で生成した JSON を貼り付けて、特定イベント時に再生する。
 *  V2.5 では 1 ルームあたり 1 アニメ。 */
export type LottieAnimation = {
  enabled: boolean;
  /** Lottie JSON テキスト全文。空なら未設定扱い */
  json: string;
  /** 編集者向けのラベル(再生される表示には影響しない) */
  name: string;
  /** どのイベントで再生するか */
  trigger: LottieTrigger;
  /** 配置 % */
  x: number;
  y: number;
  /** 表示サイズ %(横幅基準) */
  width: number;
  /** ループ再生(背景演出向き) */
  loop: boolean;
  /** 単発再生時、再生終了後にフェードアウトするミリ秒 */
  fadeOutMs: number;
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
  | "audio" // 音量に反応して脈動
  | "heartbeat" // 心音 / Terror Radius 風の二拍子鼓動
  | "crack" // 亀裂走る(ガラスにヒビ風の点滅)
  | "hexFlame" // 呪火(オレンジ/赤のチラチラ揺らぎ。color 無視)
  | "breathing" // 緩やかな呼吸(明滅ゆっくり)
  | "chase" // チェイス(速く強いパルス)
  | "scratchmark"; // スクラッチマーク風 (破線が回転)

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

/** マッチタイマーの表示スタイル(V3 で追加)。
 *  - "classic": 従来の半透明角丸ボックス + 上にラベル + 下に時刻
 *  - "bracket": 角括弧フレーム + 上ラベル、esports 競技風(背景透過)
 *  - "digital": LED スコアボード風、モノスペース + 光る digits、黒地
 *  - "pill":    角丸ピル + グラデ背景、横並び(Floating Pill レイアウトと相性◎)
 *  - "neon":    透明背景 + アウトライン文字 + ネオン点滅(DBD ホラー寄り) */
export type MatchTimerStyle = "classic" | "bracket" | "digital" | "pill" | "neon";

// 左下のマッチタイマー（カウントアップ）
export type MatchTimer = StopwatchState & {
  enabled: boolean;
  x: number; // 位置 %（既定は画面左下）
  y: number;
  color: string;
  fontScale: number;
  label: string;
  /** 表示スタイル。未指定なら "classic"(後方互換) */
  style?: MatchTimerStyle;
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

/** オーバーレイの全体レイアウトテンプレート ID。
 *  内容データ(lines/timer 等)は保持したまま、視覚層だけを差し替える。 */
export type LayoutId =
  | "classic" // 現行: 縦積み・左上集中・背景ブロック式
  | "floating-pill" // 個人配信向けの丸角ピル + ぼかし
  | "esports-score" // 公式大会風スコアバー(5 セル)
  | "lower-third"; // 放送番組テロップ風(画面下 1/3)

export type OverlaySettings = {
  iconImage: string;
  lines: Line[];
  align?: Align;
  perkCover?: PerkCover;
  matchTimer?: MatchTimer;
  sessionTimer?: SessionTimer;
  /** バイリンガル表示の共通スタイル(各 TextLine の secondaryText に適用) */
  bilingualStyle?: BilingualStyle;
  /** 今日のスクリム結果ウィジェット */
  matchLog?: MatchLogWidget;
  /** ルームに紐付ける Lottie アニメーション(イベント発火再生) */
  lottie?: LottieAnimation;
  /** オーバーレイのレイアウトテンプレート。未指定なら "classic" 扱い(後方互換) */
  layoutId?: LayoutId;
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
