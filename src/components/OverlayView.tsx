import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type {
  BilingualStyle,
  Line,
  MatchTimer,
  OverlaySettings,
  PerkCover,
  SessionTimer,
  SetsLine,
  TextLine,
} from "@/lib/types";
import { isSetsLine } from "@/lib/types";
import { defaultBilingualStyle } from "@/lib/defaults";
import { elapsedMs, fmtDown, fmtUp } from "@/lib/timer";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";
import { useAudioReactive } from "@/lib/useAudioReactive";
import { MatchLogView } from "@/components/MatchLogView";
import { LottiePlayer } from "@/components/LottiePlayer";

type Props = {
  settings: OverlaySettings;
  /** When true, PerkCover / MatchTimer / SessionTimer / MatchLog become draggable for in-place positioning. */
  editable?: boolean;
  onMovePerkCover?: (x: number, y: number) => void;
  onMoveMatchTimer?: (x: number, y: number) => void;
  onMoveSessionTimer?: (x: number, y: number) => void;
  onMoveMatchLog?: (x: number, y: number) => void;
};

const STAGE_SELECTOR = ".overlay-stage";

const hexToRgba = (hex: string | undefined, opacity: number): string => {
  if (!hex || hex.length < 7 || !hex.startsWith("#")) {
    return `rgba(45, 45, 45, ${opacity})`;
  }
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const lineText = (l: Line): string => {
  const t = l as TextLine;
  if (t.segments && t.segments.length > 0) {
    return t.segments.map((s) => s.text).join("");
  }
  return t.text || "";
};

const lineWhitespace = (l: Line): CSSProperties["whiteSpace"] =>
  lineText(l).includes("\n") ? "pre" : "nowrap";

const lineColorStyle = (l: Line): CSSProperties => {
  const t = l as TextLine;
  return !t.segments && t.color ? { color: t.color } : {};
};

const lineBgStyle = (l: Line): CSSProperties => {
  if (l.showBackground && l.backgroundColor) {
    const opacity = l.backgroundOpacity ?? 1;
    return { backgroundColor: hexToRgba(l.backgroundColor, opacity) };
  }
  return {};
};

const RenderText = ({ line, bilingual }: { line: Line; bilingual?: BilingualStyle }) => {
  const t = line as TextLine;
  // 第二テキスト(secondaryText)があり、かつバイリンガルスタイルが取得できれば主+副の2段で描画。
  // 複数色モード(segments)では従来通り単行(secondaryText は無視)。
  const secondary = (!t.segments && (t.secondaryText ?? "").trim()) || null;
  const bs = bilingual ?? defaultBilingualStyle();

  if (t.segments && t.segments.length > 0) {
    return (
      <>
        {t.segments.map((s, i) => (
          <span key={i} style={{ color: s.color }}>
            {s.text}
          </span>
        ))}
      </>
    );
  }
  const text = t.text || "";
  const lines = text.split("\n");
  const primary = (
    <>
      {lines.map((part, i) => (
        <span key={i}>
          {part}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
  if (!secondary) return primary;
  // 主の直下に小さく薄く第二テキスト。背景は引き継がず、色とサイズは共通スタイル。
  return (
    <>
      {primary}
      <div
        style={{
          fontSize: `${bs.scale}em`,
          color: bs.color,
          marginTop: `${bs.gapEm}em`,
          fontWeight: 700,
          letterSpacing: "0.04em",
          whiteSpace: secondary.includes("\n") ? "pre" : "nowrap",
        }}
      >
        {secondary.split("\n").map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </>
  );
};

// 残時間で色変化（灰 → 黄 → 赤）。ratio: 1=開始(灰) → 0=終了(赤)
const TC_GRAY = [90, 92, 100];
const TC_YELLOW = [255, 214, 0];
const TC_RED = [255, 42, 42];
const mixRgb = (a: number[], b: number[], t: number): string =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
const timerColor = (ratio: number): string => {
  const r = Math.max(0, Math.min(1, ratio));
  return r >= 0.5 ? mixRgb(TC_GRAY, TC_YELLOW, (1 - r) / 0.5) : mixRgb(TC_YELLOW, TC_RED, (0.5 - r) / 0.5);
};

const RAINBOW =
  "conic-gradient(from var(--ringAngle), #ff004c, #ff7a18, #ffe600, #29ff5e, #00e5ff, #2f6bff, #c04cff, #ff004c)";
// 指定色を流す（白いハイライトが回って指定色が光って流れて見える）
const FLOW = "conic-gradient(from var(--ringAngle), var(--glow), #ffffff, var(--glow), var(--glow), var(--glow))";

// 4パークの並びに合わせたカバー（形状切替可）＋光る枠＋枠外のカウントダウン
function PerkCoverView({
  pc,
  now,
  editable,
  onMove,
}: {
  pc: PerkCover;
  now: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
}) {
  const dragProps = useDraggablePercent({
    current: { x: pc.x, y: pc.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });

  // audio スタイルのときだけマイクを開く。それ以外は idle で何もしない。
  const audioActive = pc.glow.enabled && pc.glow.style === "audio";
  const { level: audioLevel } = useAudioReactive(
    audioActive ? (pc.glow.audio ?? null) : null,
    { enabled: audioActive, smoothingSec: pc.glow.speedSec },
  );
  const remaining = pc.timer.durationSec - elapsedMs(pc.timer, now) / 1000;
  const started = pc.timer.running || pc.timer.accumulatedMs > 0;
  // タイマー完走 OR ホットキー/リモコンからの強制開放のどちらでもリビールを発火
  const released =
    (pc.timer.enabled && started && remaining <= 0) ||
    pc.forceReleased === true;
  const ratio = pc.timer.durationSec > 0 ? Math.max(0, Math.min(1, remaining / pc.timer.durationSec)) : 0;

  const g = pc.glow;
  const glowOn = g.enabled;
  const style = g.style;
  const isRainbow = glowOn && style === "rainbow";
  const isFlow = glowOn && style === "flow";
  const isNeon = glowOn && style === "neon";
  const isSolid = glowOn && style === "solid";
  const isAudio = glowOn && style === "audio";
  const isHeartbeat = glowOn && style === "heartbeat";
  const isCrack = glowOn && style === "crack";
  const isHexFlame = glowOn && style === "hexFlame";
  const isBreathing = glowOn && style === "breathing";
  const isChase = glowOn && style === "chase";
  const isScratchmark = glowOn && style === "scratchmark";
  const spin = isRainbow || isFlow || isScratchmark; // scratchmark も回転

  const glowColor = g.colorByTimer && pc.timer.enabled ? timerColor(ratio) : g.color;
  const coverBg = hexToRgba(pc.backgroundColor, pc.opacity);

  // ring 背景の決定:
  // - rainbow / flow / scratchmark は専用 background(scratchmark は CSS 側で定義)
  // - hexFlame は CSS 側で background 設定するため "transparent" を渡す(上書きされる)
  // - その他のグローは color 指定
  const ringBackground = isRainbow
    ? RAINBOW
    : isFlow
      ? FLOW
      : isScratchmark || isHexFlame
        ? "transparent" // CSS class 側で background を設定する
        : glowOn
          ? "var(--glow)"
          : coverBg;

  const shape = pc.shape ?? "diamond";
  const reveal = pc.reveal ?? "fade";
  const revealMs = Math.max(120, Math.min(4000, pc.revealDurationMs ?? 600));

  const coverStyle = {
    left: `${pc.x}%`,
    top: `${pc.y}%`,
    width: `${pc.width}%`,
    height: `${pc.height}%`,
    "--coverBg": coverBg,
    "--glow": glowColor,
    "--glowSpeed": `${g.speedSec}s`,
    "--ringW": glowOn ? "5px" : "0px",
    "--revealMs": `${revealMs}ms`,
    "--audio-level": isAudio ? audioLevel : 0,
  } as CSSProperties;

  // 残時間が urgentBelowSec を切ったらカウントダウンを点滅
  const urgentPulse = pc.timer.urgentPulse ?? true;
  const urgentBelow = pc.timer.urgentBelowSec ?? 10;
  const urgent =
    urgentPulse && pc.timer.enabled && started && !released && remaining > 0 && remaining <= urgentBelow;

  return (
    <>
      <div
        className={cn(
          "perk-cover",
          `shape-${shape}`,
          `reveal-${reveal}`,
          released && "released",
          editable && onMove && "edit-draggable",
        )}
        style={coverStyle}
        {...(editable && onMove ? dragProps : {})}
      >
        <div
          className={cn(
            "perk-diamond-frame",
            isNeon && "neon",
            spin && "spin",
            isSolid && "glow-static",
            isAudio && "audio",
            isHeartbeat && "heartbeat",
            isCrack && "crack",
            isHexFlame && "hex-flame",
            isBreathing && "breathing",
            isChase && "chase",
            isScratchmark && "scratchmark",
          )}
          style={{ background: ringBackground }}
        >
          <div className="perk-diamond-inner">
            {pc.image && <img src={pc.image} alt="" style={{ objectFit: pc.fit }} />}
          </div>
        </div>
      </div>

      {pc.timer.enabled && pc.timer.showCountdown && !released && (
        <div
          className="perk-countdown-anchor"
          style={{ left: `${pc.x}%`, top: `${pc.y}%`, width: `${pc.width}%`, height: `${pc.height}%` }}
        >
          <div
            className={cn("perk-countdown", `pos-${pc.timer.countdownPos}`, urgent && "urgent")}
            style={{ color: pc.timer.countdownColor }}
          >
            {fmtDown(remaining)}
          </div>
        </div>
      )}
    </>
  );
}

// 左下のマッチタイマー（カウントアップ）
function MatchTimerView({
  mt,
  now,
  editable,
  onMove,
}: {
  mt: MatchTimer;
  now: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
}) {
  const dragProps = useDraggablePercent({
    current: { x: mt.x, y: mt.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });
  return (
    <div
      className={cn(editable && onMove && "edit-draggable")}
      style={{
        position: "absolute",
        left: `${mt.x}%`,
        top: `${mt.y}%`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontWeight: 900,
        fontVariantNumeric: "tabular-nums",
        color: mt.color,
        fontSize: `${mt.fontScale * 28}px`,
        lineHeight: 1.05,
        background: "rgba(0,0,0,0.42)",
        padding: "6px 14px",
        borderRadius: 8,
        textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
      }}
      {...(editable && onMove ? dragProps : {})}
    >
      {mt.label && (
        <span style={{ fontSize: "0.42em", fontWeight: 700, letterSpacing: "0.12em", opacity: 0.85 }}>
          {mt.label}
        </span>
      )}
      <span>{fmtUp(elapsedMs(mt, now) / 1000)}</span>
    </div>
  );
}

// 通しタイマー（OBS録画通し時間・カウントアップ）。位置・色は SessionTimer 側で制御。
function SessionTimerView({
  st,
  now,
  editable,
  onMove,
}: {
  st: SessionTimer;
  now: number;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
}) {
  const dragProps = useDraggablePercent({
    current: { x: st.x, y: st.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });
  // 1時間超えで H:MM:SS、それ未満は MM:SS を出すのは fmtUp 側で対応済み。
  return (
    <div
      className={cn(editable && onMove && "edit-draggable")}
      style={{
        position: "absolute",
        left: `${st.x}%`,
        top: `${st.y}%`,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: st.color,
        fontSize: `${st.fontScale * 22}px`,
        lineHeight: 1.05,
        background: "rgba(0,0,0,0.42)",
        padding: "4px 10px",
        borderRadius: 6,
        textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
      }}
      {...(editable && onMove ? dragProps : {})}
    >
      {st.label && (
        <span
          style={{
            fontSize: "0.42em",
            fontWeight: 700,
            letterSpacing: "0.12em",
            opacity: 0.9,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {st.running && (
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FF3B3B",
                boxShadow: "0 0 6px rgba(255,59,59,0.85)",
              }}
            />
          )}
          {st.label}
        </span>
      )}
      <span>{fmtUp(elapsedMs(st, now) / 1000)}</span>
    </div>
  );
}

export function OverlayView({
  settings,
  editable,
  onMovePerkCover,
  onMoveMatchTimer,
  onMoveSessionTimer,
  onMoveMatchLog,
}: Props) {
  const { iconImage, lines, perkCover, matchTimer, sessionTimer } = settings;
  const lottie = settings.lottie;
  const [maxRowWidth, setMaxRowWidth] = useState(0);
  const [iconSize, setIconSize] = useState(40);
  const [autoSetIndex, setAutoSetIndex] = useState(0);
  const [setFading, setSetFading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLDivElement | null>(null);

  // Lottie 再生シグナル: トリガーイベント発火ごとに 1 ずつ増やして子に通知
  const [lottiePlaySignal, setLottiePlaySignal] = useState(0);
  const prevMatchRunningRef = useRef<boolean>(!!matchTimer?.running);

  // タイマー稼働中のみ 250ms ごとに now を更新（local state なので broadcast しない）
  const timersRunning =
    !!perkCover?.timer?.running || !!matchTimer?.running || !!sessionTimer?.running;
  useEffect(() => {
    if (!timersRunning) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timersRunning]);

  // Lottie トリガー: room-activate(マウント時に1回発火)
  useEffect(() => {
    if (!lottie?.enabled || lottie.trigger !== "room-activate") return;
    setLottiePlaySignal((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lottie トリガー: match-start(matchTimer.running が false→true 遷移)
  useEffect(() => {
    if (!lottie?.enabled || lottie.trigger !== "match-start") return;
    const cur = !!matchTimer?.running;
    if (!prevMatchRunningRef.current && cur) {
      setLottiePlaySignal((s) => s + 1);
    }
    prevMatchRunningRef.current = cur;
  }, [matchTimer?.running, lottie?.enabled, lottie?.trigger]);

  // Equal width across rows 2-4
  useLayoutEffect(() => {
    const widths = rowRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.scrollWidth);
    if (widths.length > 0) {
      setMaxRowWidth(Math.max(...widths));
    }
  }, [lines]);

  // Icon sizing follows Ladder row height
  useLayoutEffect(() => {
    if (titleRef.current) {
      const h = titleRef.current.offsetHeight;
      setIconSize(Math.max(40, Math.min(h, 80)));
    }
  }, [lines]);

  const setsLine = lines[5] as SetsLine | undefined;
  const setsVisible = setsLine?.visible && setsLine.sets && setsLine.sets.length > 0;
  const setsCount = setsLine?.sets?.length ?? 0;
  const cycleMode = setsLine?.cycleMode ?? "auto";
  // manual モード時は settings 由来の currentSetIndex、auto モード時はローカル自動カウンタを参照
  const manualSetIndex = Math.min(
    Math.max(0, setsLine?.currentSetIndex ?? 0),
    Math.max(0, setsCount - 1),
  );
  const setIndex = cycleMode === "manual" ? manualSetIndex : autoSetIndex;
  const prevManualSetIndexRef = useRef(manualSetIndex);
  const prevSetIndexRef = useRef(setIndex);

  // manual モード時の SET 切替にもフェード演出をかける(押した瞬間の見栄え)
  useEffect(() => {
    if (cycleMode !== "manual") return;
    if (prevManualSetIndexRef.current === manualSetIndex) return;
    prevManualSetIndexRef.current = manualSetIndex;
    setSetFading(true);
    const t = window.setTimeout(() => setSetFading(false), 380);
    return () => clearTimeout(t);
  }, [cycleMode, manualSetIndex]);

  // Lottie トリガー: set-change(setIndex の変化を検知)
  useEffect(() => {
    if (!lottie?.enabled || lottie.trigger !== "set-change") return;
    if (prevSetIndexRef.current !== setIndex) {
      setLottiePlaySignal((s) => s + 1);
    }
    prevSetIndexRef.current = setIndex;
  }, [setIndex, lottie?.enabled, lottie?.trigger]);

  // auto モード時は 3 秒ごとにフェード遷移して次のSETへ
  useEffect(() => {
    if (!setsVisible || cycleMode !== "auto") {
      setAutoSetIndex(0);
      setSetFading(false);
      return;
    }
    if (autoSetIndex >= setsCount) setAutoSetIndex(0);

    let next: number | undefined;
    let post: number | undefined;
    const tick = () => {
      setSetFading(true);
      post = window.setTimeout(() => {
        setAutoSetIndex((i) => (i + 1) % setsCount);
        setSetFading(false);
        next = window.setTimeout(tick, 3000);
      }, 850);
    };
    next = window.setTimeout(tick, 3000);
    return () => {
      if (next) clearTimeout(next);
      if (post) clearTimeout(post);
    };
  }, [setsVisible, setsCount, autoSetIndex, cycleMode]);

  const middleLines = lines.slice(2, 5);

  const align = settings.align ?? "left";
  const itemsClass =
    align === "center" ? "items-center" : align === "right" ? "items-end" : "items-start";

  return (
    <div
      className={cn(
        "relative w-full h-full",
        // The drag handler in useDraggablePercent looks for this class on a parent.
        "overlay-stage",
      )}
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* 試合情報ブロック（従来どおり左上・全幅で整列） */}
      <div className={`absolute top-0 left-0 right-0 p-4 flex flex-col ${itemsClass}`}>
        {lines[0].visible && (
          <div className="flex items-center gap-2 mb-1">
            {iconImage && (
              <img
                src={iconImage}
                alt="Game Icon"
                className="object-contain flex-shrink-0"
                style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
              />
            )}
            <div
              ref={titleRef}
              style={{
                ...lineColorStyle(lines[0]),
                ...lineBgStyle(lines[0]),
                fontWeight: 900,
                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                whiteSpace: lineWhitespace(lines[0]),
                ...(lines[0].showBackground
                  ? { paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }
                  : {}),
              }}
              className="text-base opacity-90 tracking-wide"
            >
              <RenderText line={lines[0]} bilingual={settings.bilingualStyle} />
            </div>
          </div>
        )}

        {lines[1].visible && lineText(lines[1]) && (
          <div
            style={{
              ...lineColorStyle(lines[1]),
              ...lineBgStyle(lines[1]),
              fontWeight: 900,
              textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
              whiteSpace: lineWhitespace(lines[1]),
              ...(lines[1].showBackground
                ? {
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 6,
                    paddingBottom: 6,
                    display: "inline-block",
                  }
                : {}),
            }}
            className="text-4xl mb-2 tracking-tight leading-tight"
          >
            <RenderText line={lines[1]} bilingual={settings.bilingualStyle} />
          </div>
        )}

        <div className={`mt-1 space-y-2 flex flex-col ${itemsClass}`}>
          {middleLines.map(
            (line, i) =>
              line.visible &&
              lineText(line) && (
                <div
                  key={i + 2}
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  className="py-2.5 text-center inline-block"
                  style={{
                    ...lineColorStyle(line),
                    ...lineBgStyle(line),
                    width: maxRowWidth > 0 ? `${maxRowWidth}px` : "auto",
                    fontWeight: 900,
                    textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                    letterSpacing: "0.02em",
                    whiteSpace: lineWhitespace(line),
                    paddingLeft: 20,
                    paddingRight: 20,
                  }}
                >
                  <RenderText line={line} bilingual={settings.bilingualStyle} />
                </div>
              ),
          )}
        </div>

        {setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex] && (
          <div className={`mt-2 flex flex-col ${itemsClass}`}>
            <div
              className="relative inline-block"
              style={{ overflow: "hidden", ...lineBgStyle(setsLine) }}
            >
              <div
                className="py-2.5 px-5 text-left inline-block relative"
                style={{
                  fontWeight: 900,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                  color: setsLine.color || "#FFFFFF",
                  opacity: setFading ? 0 : 1,
                  transform: setFading ? "translateY(-100%)" : "translateY(0)",
                  filter: setFading ? "blur(8px)" : "blur(0px)",
                  transition:
                    "opacity 850ms ease-out, transform 850ms ease-out, filter 850ms ease-out",
                  willChange: "opacity, transform, filter",
                  zIndex: 1,
                }}
              >
                <span style={{ fontWeight: 900 }}>
                  ▶SET{setsLine.sets[setIndex].setNumber}:
                </span>
                <span style={{ fontWeight: 600 }}>
                  {setsLine.sets[setIndex].killerName}（{setsLine.sets[setIndex].playerName}）
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右下のパーク隠しカバー */}
      {perkCover?.enabled && (
        <PerkCoverView
          pc={perkCover}
          now={now}
          editable={editable}
          onMove={onMovePerkCover}
        />
      )}

      {/* 左下のマッチタイマー */}
      {matchTimer?.enabled && (
        <MatchTimerView
          mt={matchTimer}
          now={now}
          editable={editable}
          onMove={onMoveMatchTimer}
        />
      )}

      {/* 通しタイマー(OBS 録画通し時間) */}
      {sessionTimer?.enabled && (
        <SessionTimerView
          st={sessionTimer}
          now={now}
          editable={editable}
          onMove={onMoveSessionTimer}
        />
      )}

      {/* マッチログ(今日のスクリム結果) */}
      {settings.matchLog?.enabled && (
        <MatchLogView ml={settings.matchLog} editable={editable} onMove={onMoveMatchLog} />
      )}

      {/* Lottie アニメーション(イベント発火再生) */}
      {lottie?.enabled && (
        <LottiePlayer animation={lottie} playSignal={lottiePlaySignal} />
      )}
    </div>
  );
}
