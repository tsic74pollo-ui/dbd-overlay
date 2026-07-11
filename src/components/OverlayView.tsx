import { useEffect, useRef, useState } from "react";
import type { OverlaySettings, SetsLine } from "@/lib/types";
import { cn } from "@/lib/cn";
import { MatchLogView } from "@/components/MatchLogView";
import { PerkCoverView } from "@/components/overlay/parts/PerkCoverView";
import { MatchTimerView } from "@/components/overlay/parts/MatchTimerView";
import { SessionTimerView } from "@/components/overlay/parts/SessionTimerView";
import { LAYOUTS } from "@/components/overlay/layoutRegistry";

type Props = {
  settings: OverlaySettings;
  /** When true, PerkCover / MatchTimer / SessionTimer / MatchLog become draggable for in-place positioning. */
  editable?: boolean;
  onMovePerkCover?: (x: number, y: number) => void;
  onMoveMatchTimer?: (x: number, y: number) => void;
  onMoveSessionTimer?: (x: number, y: number) => void;
  onMoveMatchLog?: (x: number, y: number) => void;
};

/**
 * OverlayView は dispatcher 役。
 *   - 共通の state (now / setIndex 等) はここで管理
 *   - layoutId に応じてレイアウトコンポーネントを差し替え
 *   - PerkCover / MatchTimer / SessionTimer / MatchLog は全レイアウト共通(ここで描画)
 *
 * レイアウト本体(タイトル/SET 表示)は `src/components/overlay/OverlayLayout*.tsx` 群が担当。
 */
export function OverlayView({
  settings,
  editable,
  onMovePerkCover,
  onMoveMatchTimer,
  onMoveSessionTimer,
  onMoveMatchLog,
}: Props) {
  const { perkCover, matchTimer, sessionTimer, lines } = settings;
  const [autoSetIndex, setAutoSetIndex] = useState(0);
  const [setFading, setSetFading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // タイマー稼働中のみ 250ms ごとに now を更新
  const timersRunning =
    !!perkCover?.timer?.running || !!matchTimer?.running || !!sessionTimer?.running;
  useEffect(() => {
    if (!timersRunning) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timersRunning]);

  // SET 状態の解決
  const setsLine = (lines[5] as SetsLine | undefined) ?? null;
  const setsVisible = !!(setsLine?.visible && setsLine.sets && setsLine.sets.length > 0);
  const setsCount = setsLine?.sets?.length ?? 0;
  const cycleMode = setsLine?.cycleMode ?? "auto";
  const manualSetIndex = Math.min(
    Math.max(0, setsLine?.currentSetIndex ?? 0),
    Math.max(0, setsCount - 1),
  );
  const setIndex = cycleMode === "manual" ? manualSetIndex : autoSetIndex;
  const prevManualSetIndexRef = useRef(manualSetIndex);

  // manual モード時の SET 切替フェード
  useEffect(() => {
    if (cycleMode !== "manual") return;
    if (prevManualSetIndexRef.current === manualSetIndex) return;
    prevManualSetIndexRef.current = manualSetIndex;
    setSetFading(true);
    const t = window.setTimeout(() => setSetFading(false), 380);
    return () => clearTimeout(t);
  }, [cycleMode, manualSetIndex]);

  // auto モード時の SET 自動切替
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

  // レイアウト解決(未指定なら classic にフォールバック)
  const layoutId = settings.layoutId ?? "classic";
  const Layout = (LAYOUTS[layoutId] ?? LAYOUTS.classic).Component;

  return (
    <div
      className={cn("relative w-full h-full", "overlay-stage")}
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      {/* テンプレート別のテキスト/SET 表示（整列: 左/中央/右 は Layout 内部が担当） */}
      <Layout
        settings={settings}
        setIndex={setIndex}
        setFading={setFading}
        setsLine={setsLine}
        setsVisible={setsVisible}
      />

      {/* 共通: パーク隠しカバー */}
      {perkCover?.enabled && (
        <PerkCoverView
          pc={perkCover}
          now={now}
          editable={editable}
          onMove={onMovePerkCover}
        />
      )}

      {/* 共通: マッチタイマー */}
      {matchTimer?.enabled && (
        <MatchTimerView
          mt={matchTimer}
          now={now}
          editable={editable}
          onMove={onMoveMatchTimer}
        />
      )}

      {/* 共通: 通しタイマー */}
      {sessionTimer?.enabled && (
        <SessionTimerView
          st={sessionTimer}
          now={now}
          editable={editable}
          onMove={onMoveSessionTimer}
        />
      )}

      {/* 共通: マッチログ */}
      {settings.matchLog?.enabled && (
        <MatchLogView ml={settings.matchLog} editable={editable} onMove={onMoveMatchLog} />
      )}
    </div>
  );
}
