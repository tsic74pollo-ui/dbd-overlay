import { type CSSProperties } from "react";
import type { PerkCover } from "@/lib/types";
import { elapsedMs, fmtDown } from "@/lib/timer";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";
import { useAudioReactive } from "@/lib/useAudioReactive";
import { FLOW, RAINBOW, STAGE_SELECTOR, hexToRgba, timerColor } from "./helpers";

/** 4パークの並びに合わせたカバー（形状切替可）＋光る枠＋枠外のカウントダウン。
 *  全レイアウト共通(位置は perkCover.x/y で各自指定)。 */
export function PerkCoverView({
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
  const ratio =
    pc.timer.durationSec > 0
      ? Math.max(0, Math.min(1, remaining / pc.timer.durationSec))
      : 0;

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
  const spin = isRainbow || isFlow || isScratchmark;

  const glowColor = g.colorByTimer && pc.timer.enabled ? timerColor(ratio) : g.color;
  const coverBg = hexToRgba(pc.backgroundColor, pc.opacity);

  const ringBackground = isRainbow
    ? RAINBOW
    : isFlow
      ? FLOW
      : isScratchmark || isHexFlame
        ? "transparent"
        : glowOn
          ? "var(--glow)"
          : coverBg;

  const shape = pc.shape ?? "diamond";
  const reveal = pc.reveal ?? "fade";
  const revealMs = Math.max(120, Math.min(4000, pc.revealDurationMs ?? 600));

  // 視点反転(Killer 右下 ↔ Survivor 左下)。
  // store の x は元のまま保持し、描画時のみ水平反転して位置を求める。
  const renderedX = pc.mirror ? Math.max(0, 100 - pc.x - pc.width) : pc.x;

  const coverStyle = {
    left: `${renderedX}%`,
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

  const urgentPulse = pc.timer.urgentPulse ?? true;
  const urgentBelow = pc.timer.urgentBelowSec ?? 10;
  const urgent =
    urgentPulse &&
    pc.timer.enabled &&
    started &&
    !released &&
    remaining > 0 &&
    remaining <= urgentBelow;

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
          style={{
            left: `${renderedX}%`,
            top: `${pc.y}%`,
            width: `${pc.width}%`,
            height: `${pc.height}%`,
          }}
        >
          <div
            className={cn(
              "perk-countdown",
              `pos-${pc.timer.countdownPos}`,
              urgent && "urgent",
            )}
            style={{ color: pc.timer.countdownColor }}
          >
            {fmtDown(remaining)}
          </div>
        </div>
      )}
    </>
  );
}
