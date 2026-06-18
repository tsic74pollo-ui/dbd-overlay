import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppPersistedState,
  MatchResult,
  ObsConfig,
  OverlaySettings,
  Room,
  SetsLine,
} from "@/lib/types";
import { isSetsLine } from "@/lib/types";
import {
  defaultObsConfig,
  newRoom,
  normalizePerkCover,
  normalizeMatchTimer,
  normalizeMatchLog,
  normalizeSessionTimer,
} from "@/lib/defaults";
import { tryLoadLegacy } from "@/lib/migrateLegacy";
import { startSw, resetSw, elapsedMs } from "@/lib/timer";

type AppActions = {
  addRoom: (name?: string) => string;
  duplicateRoom: (id: string) => string;
  removeRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  setActiveRoom: (id: string) => void;
  updateActiveRoomSettings: (updater: (s: OverlaySettings) => OverlaySettings) => void;
  setRoomSettings: (id: string, settings: OverlaySettings) => void;
  setRooms: (rooms: Room[], activeRoomId?: string) => void;
  /** ルーム本体の任意フィールドをパッチ更新(obsSceneName / resetMatchTimerOnActivate 等)。 */
  patchRoom: (id: string, patch: Partial<Room>) => void;
  setApiKey: (key: string | null) => void;
  /** OBS WebSocket 設定 */
  setObsConfig: (patch: Partial<ObsConfig>) => void;
  /** マッチ結果を 1 件記録 + matchTimer リセット + 現マッチクリア
   *
   * isPowered=true: kills/stages を尊重(0-4 / 0-12)
   * isPowered=false かつ gensRemaining 指定: 4K12S 確定 で kills/stages は強制 4/12
   * killer 未指定なら現在 SET から自動取得、note は完全フリーワード */
  recordMatchResult: (input: {
    killer?: string;
    note?: string;
    kills?: number;
    stages?: number;
    isPowered: boolean;
    gensRemaining?: number;
  }) => void;
  /** 蓄積されたマッチ記録を全消去 */
  clearMatchLog: () => void;
  /**
   * ホットキー / リモコン用の高レベルアクション。いずれも内部で
   * updateActiveRoomSettings を経由するので useRoomsSync 側の broadcast に
   * 自動的に乗る(オーバーレイ側にも即時反映される)。
   */
  /** マッチタイマー: 停止中(かつ 0) → 開始 / それ以外(稼働中 or 経過あり) → リセット */
  startResetMatchTimer: () => void;
  /** パーク開放カウントダウン: 停止中 → 開始 / 稼働中 or 経過あり → リセット */
  startResetPerkTimer: () => void;
  /** 通しタイマー: 停止中 → 開始 / 稼働中 or 経過あり → リセット */
  startResetSessionTimer: () => void;
  /** 次のSETへ(SetsLine が manual モードのとき有効) */
  cycleSets: (dir: 1 | -1) => void;
  /** ホットキー B 旧仕様(強制即開放)。UI ボタン用に残す */
  releasePerkCover: () => void;
  cycleRoom: (dir: 1 | -1) => void;
};

export type AppStore = AppPersistedState & AppActions;

const buildInitialState = (): AppPersistedState => {
  const legacy = tryLoadLegacy();
  const firstName = legacy ? "メイン" : "メイン";
  const first = newRoom(firstName);
  if (legacy) first.settings = legacy;
  return {
    rooms: [first],
    activeRoomId: first.id,
    apiKey: null,
    obs: defaultObsConfig(),
  };
};

/** ルームをアクティブ化したときの副作用(マッチタイマー自動 reset 等)を適用する。
 *  Optional に未設定なら no-op。OBS シーン切替は useObsConnection 側で行う(ストアから副作用呼ばない)。 */
const applyActivation = (rooms: Room[], targetId: string): Room[] => {
  return rooms.map((r) => {
    if (r.id !== targetId) return r;
    if (!r.resetMatchTimerOnActivate) return r;
    const mt = normalizeMatchTimer(r.settings.matchTimer);
    return {
      ...r,
      settings: { ...r.settings, matchTimer: resetSw({ ...mt, enabled: mt.enabled }) },
      updatedAt: Date.now(),
    };
  });
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),
      addRoom: (name) => {
        const r = newRoom(name ?? `ルーム ${get().rooms.length + 1}`);
        set({ rooms: [...get().rooms, r], activeRoomId: r.id });
        return r.id;
      },
      duplicateRoom: (id) => {
        const src = get().rooms.find((r) => r.id === id);
        if (!src) return id;
        const copy: Room = {
          ...src,
          id: crypto.randomUUID(),
          name: `${src.name} (コピー)`,
          settings: JSON.parse(JSON.stringify(src.settings)),
          updatedAt: Date.now(),
        };
        set({ rooms: [...get().rooms, copy], activeRoomId: copy.id });
        return copy.id;
      },
      removeRoom: (id) => {
        const remaining = get().rooms.filter((r) => r.id !== id);
        if (remaining.length === 0) {
          const r = newRoom("メイン");
          set({ rooms: [r], activeRoomId: r.id });
          return;
        }
        const activeRoomId =
          get().activeRoomId === id ? remaining[0].id : get().activeRoomId;
        set({ rooms: remaining, activeRoomId });
      },
      renameRoom: (id, name) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === id ? { ...r, name, updatedAt: Date.now() } : r,
          ),
        });
      },
      setActiveRoom: (id) => {
        const rooms = applyActivation(get().rooms, id);
        set({ rooms, activeRoomId: id });
      },
      patchRoom: (id, patch) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r,
          ),
        });
      },
      setObsConfig: (patch) => {
        set({ obs: { ...get().obs, ...patch } });
      },
      updateActiveRoomSettings: (updater) => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) =>
            r.id === id
              ? { ...r, settings: updater(r.settings), updatedAt: Date.now() }
              : r,
          ),
        });
      },
      setRoomSettings: (id, settings) => {
        set({
          rooms: get().rooms.map((r) =>
            r.id === id ? { ...r, settings, updatedAt: Date.now() } : r,
          ),
        });
      },
      setRooms: (rooms, activeRoomId) => {
        if (rooms.length === 0) return;
        const wantedActive =
          activeRoomId && rooms.some((r) => r.id === activeRoomId)
            ? activeRoomId
            : rooms.some((r) => r.id === get().activeRoomId)
              ? get().activeRoomId
              : rooms[0].id;
        set({ rooms, activeRoomId: wantedActive });
      },
      setApiKey: (apiKey) => set({ apiKey }),

      // ---- Hotkey / Remote actions ----------------------------------------
      // 「停止中かつ経過 0」のときだけ start。それ以外(稼働中/経過あり)は reset。
      // 押す → 開始 → 押す → 0 に戻る、というシンプルな2状態サイクル。
      startResetMatchTimer: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const mt = normalizeMatchTimer(r.settings.matchTimer);
            const idle = !mt.running && mt.accumulatedMs === 0;
            const next = idle ? startSw(mt) : resetSw(mt);
            const ensured = { ...next, enabled: true };
            // マッチログにも「進行中マッチ」 を反映
            // idle → start: 新マッチ開始(currentMatchNo + currentStartedAtSec を記録)
            // それ以外 → reset: 進行中マッチ破棄(currentMatchNo クリア)
            const ml = normalizeMatchLog(r.settings.matchLog);
            let nextMl = ml;
            if (idle) {
              const st = normalizeSessionTimer(r.settings.sessionTimer);
              const startedAtSec = elapsedMs(st, Date.now()) / 1000;
              const matchNo =
                ml.records.length > 0
                  ? Math.max(...ml.records.map((rec) => rec.matchNo)) + 1
                  : 1;
              nextMl = { ...ml, currentMatchNo: matchNo, currentStartedAtSec: startedAtSec };
            } else {
              nextMl = { ...ml, currentMatchNo: null, currentStartedAtSec: null };
            }
            return {
              ...r,
              settings: { ...r.settings, matchTimer: ensured, matchLog: nextMl },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      startResetPerkTimer: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const pc = normalizePerkCover(r.settings.perkCover);
            const t = pc.timer;
            const idle = !t.running && t.accumulatedMs === 0;
            const nextTimer = idle ? startSw(t) : resetSw(t);
            return {
              ...r,
              settings: {
                ...r.settings,
                perkCover: {
                  ...pc,
                  enabled: true,
                  timer: { ...nextTimer, enabled: true },
                  // リセット時は強制開放フラグも巻き戻す(カバーを再表示)
                  forceReleased: false,
                },
              },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      startResetSessionTimer: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const st = normalizeSessionTimer(r.settings.sessionTimer);
            const idle = !st.running && st.accumulatedMs === 0;
            const next = idle ? startSw(st) : resetSw(st);
            return {
              ...r,
              settings: {
                ...r.settings,
                sessionTimer: { ...next, enabled: true },
              },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      cycleSets: (dir) => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            // SetsLine を探す(lines の中で唯一)
            const idx = r.settings.lines.findIndex(isSetsLine);
            if (idx < 0) return r;
            const sl = r.settings.lines[idx] as SetsLine;
            if (!sl.sets || sl.sets.length === 0) return r;
            // manual モードでないなら無効(誤操作を防ぐ)
            if ((sl.cycleMode ?? "auto") !== "manual") return r;
            const cur = sl.currentSetIndex ?? 0;
            const next = (cur + dir + sl.sets.length) % sl.sets.length;
            const newLines = r.settings.lines.map((l, i) =>
              i === idx ? { ...(l as SetsLine), currentSetIndex: next } : l,
            );
            return {
              ...r,
              settings: { ...r.settings, lines: newLines },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      releasePerkCover: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const pc = normalizePerkCover(r.settings.perkCover);
            return {
              ...r,
              settings: {
                ...r.settings,
                perkCover: { ...pc, enabled: true, forceReleased: true },
              },
              updatedAt: Date.now(),
            };
          }),
        });
        // リビールアニメ後にフラグを戻して次回の試合でまた使えるようにする。
        // revealDurationMs を尊重しつつ、最低 1.5s/最大 4s の保険値で安定動作。
        const revealMs = (() => {
          const r = get().rooms.find((x) => x.id === id);
          const ms = r?.settings.perkCover?.revealDurationMs ?? 600;
          return Math.max(1500, Math.min(4000, ms + 1200));
        })();
        window.setTimeout(() => {
          set({
            rooms: get().rooms.map((r) => {
              if (r.id !== id) return r;
              const pc = r.settings.perkCover;
              if (!pc?.forceReleased) return r;
              return {
                ...r,
                settings: {
                  ...r.settings,
                  perkCover: { ...pc, forceReleased: false },
                },
                updatedAt: Date.now(),
              };
            }),
          });
        }, revealMs);
      },

      recordMatchResult: ({ killer, note, kills, stages, isPowered, gensRemaining }) => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const ml = normalizeMatchLog(r.settings.matchLog);
            const mt = normalizeMatchTimer(r.settings.matchTimer);
            const st = normalizeSessionTimer(r.settings.sessionTimer);
            const now = Date.now();
            const endedAtSec = elapsedMs(st, now) / 1000;
            const matchDurationSec = elapsedMs(mt, now) / 1000;
            const startedAtSec =
              ml.currentStartedAtSec ?? Math.max(0, endedAtSec - matchDurationSec);
            const matchNo =
              ml.currentMatchNo ??
              (ml.records.length > 0
                ? Math.max(...ml.records.map((rec) => rec.matchNo)) + 1
                : 1);

            // killer の自動取得: SetsLine の現在の SET から拾う(note は完全に手入力なので自動取得しない)
            let autoKiller = "";
            const sl = r.settings.lines.find(isSetsLine);
            if (sl) {
              const idx = Math.min(
                Math.max(0, sl.currentSetIndex ?? 0),
                Math.max(0, sl.sets.length - 1),
              );
              const cur = sl.sets[idx];
              if (cur) {
                autoKiller = cur.killerName ?? "";
              }
            }

            // !isPowered (全滅) かつ G 残数指定の場合は kills/stages を 4/12 強制
            const lockedFull = !isPowered && typeof gensRemaining === "number";
            const finalKills = lockedFull
              ? 4
              : Math.min(4, Math.max(0, Math.round(kills ?? 0)));
            const finalStages = lockedFull
              ? 12
              : Math.min(12, Math.max(0, Math.round(stages ?? 0)));

            const newRecord: MatchResult = {
              matchNo,
              startedAtSec,
              endedAtSec,
              killer: (killer ?? "").trim() || autoKiller,
              note: (note ?? "").trim(),
              kills: finalKills,
              stages: finalStages,
              isPowered,
              gensRemaining: lockedFull ? gensRemaining : undefined,
            };

            const nextRecords = [...ml.records, newRecord];
            const nextMl = {
              ...ml,
              records: nextRecords,
              currentMatchNo: null,
              currentStartedAtSec: null,
              enabled: true, // 記録した瞬間にウィジェットも自動表示
            };
            // matchTimer もリセット(次マッチ準備状態に)
            const nextMt = resetSw({ ...mt, enabled: mt.enabled });

            return {
              ...r,
              settings: { ...r.settings, matchLog: nextMl, matchTimer: nextMt },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      clearMatchLog: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const ml = normalizeMatchLog(r.settings.matchLog);
            return {
              ...r,
              settings: {
                ...r.settings,
                matchLog: { ...ml, records: [], currentMatchNo: null, currentStartedAtSec: null },
              },
              updatedAt: Date.now(),
            };
          }),
        });
      },

      cycleRoom: (dir) => {
        const { rooms, activeRoomId } = get();
        if (rooms.length < 2) return;
        const idx = rooms.findIndex((r) => r.id === activeRoomId);
        const nextIdx = (idx + dir + rooms.length) % rooms.length;
        const nextId = rooms[nextIdx].id;
        const activated = applyActivation(rooms, nextId);
        set({ rooms: activated, activeRoomId: nextId });
      },
    }),
    {
      name: "dbd-overlay-app-v1",
      partialize: (s): AppPersistedState => ({
        rooms: s.rooms,
        activeRoomId: s.activeRoomId,
        apiKey: s.apiKey,
        obs: s.obs,
      }),
      // 古い localStorage に obs が無いケースに備えて merge を明示
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppPersistedState>;
        return {
          ...current,
          ...p,
          obs: { ...defaultObsConfig(), ...(p.obs ?? {}) },
        } as AppPersistedState & typeof current;
      },
    },
  ),
);

export const selectActiveRoom = (s: AppStore): Room | undefined =>
  s.rooms.find((r) => r.id === s.activeRoomId);
