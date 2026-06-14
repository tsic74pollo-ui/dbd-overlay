import type { StopwatchState } from "./types";

// ストップウォッチ操作（イミュータブル）。余分なフィールド（enabled 等）は保持する。
export const startSw = <T extends StopwatchState>(s: T): T =>
  s.running ? s : { ...s, startedAt: Date.now(), running: true };

export const stopSw = <T extends StopwatchState>(s: T): T =>
  s.running && s.startedAt != null
    ? { ...s, accumulatedMs: s.accumulatedMs + (Date.now() - s.startedAt), startedAt: null, running: false }
    : { ...s, startedAt: null, running: false };

export const resetSw = <T extends StopwatchState>(s: T): T =>
  ({ ...s, accumulatedMs: 0, startedAt: null, running: false });

export const elapsedMs = (s: StopwatchState, now: number): number =>
  s.accumulatedMs + (s.running && s.startedAt != null ? now - s.startedAt : 0);

// 秒を MM:SS（必要なら H:MM:SS）に。カウントアップ用。
export const fmtUp = (totalSec: number): string => {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(2, "0");
  const sss = String(ss).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${sss}` : `${mm}:${sss}`;
};

// 残り秒を M:SS に。カウントダウン用。
export const fmtDown = (remainingSec: number): string => {
  const s = Math.max(0, Math.ceil(remainingSec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};
