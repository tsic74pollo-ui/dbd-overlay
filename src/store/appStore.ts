import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppPersistedState, OverlaySettings, Room } from "@/lib/types";
import { newRoom, normalizePerkCover, normalizeMatchTimer } from "@/lib/defaults";
import { tryLoadLegacy } from "@/lib/migrateLegacy";
import { startSw, stopSw } from "@/lib/timer";

type AppActions = {
  addRoom: (name?: string) => string;
  duplicateRoom: (id: string) => string;
  removeRoom: (id: string) => void;
  renameRoom: (id: string, name: string) => void;
  setActiveRoom: (id: string) => void;
  updateActiveRoomSettings: (updater: (s: OverlaySettings) => OverlaySettings) => void;
  setRoomSettings: (id: string, settings: OverlaySettings) => void;
  setRooms: (rooms: Room[], activeRoomId?: string) => void;
  setApiKey: (key: string | null) => void;
  /**
   * ホットキー / リモコン用の高レベルアクション。いずれも内部で
   * updateActiveRoomSettings を経由するので useRoomsSync 側の broadcast に
   * 自動的に乗る(オーバーレイ側にも即時反映される)。
   */
  toggleMatchTimer: () => void;
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
  };
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
      setActiveRoom: (id) => set({ activeRoomId: id }),
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
      toggleMatchTimer: () => {
        const id = get().activeRoomId;
        set({
          rooms: get().rooms.map((r) => {
            if (r.id !== id) return r;
            const mt = normalizeMatchTimer(r.settings.matchTimer);
            const next = mt.running ? stopSw(mt) : startSw(mt);
            // タイマー有効でなければ自動的に有効化(オーバーレイに出るようにする)
            const ensured = { ...next, enabled: true };
            return {
              ...r,
              settings: { ...r.settings, matchTimer: ensured },
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

      cycleRoom: (dir) => {
        const { rooms, activeRoomId } = get();
        if (rooms.length < 2) return;
        const idx = rooms.findIndex((r) => r.id === activeRoomId);
        const nextIdx = (idx + dir + rooms.length) % rooms.length;
        set({ activeRoomId: rooms[nextIdx].id });
      },
    }),
    {
      name: "dbd-overlay-app-v1",
      partialize: (s): AppPersistedState => ({
        rooms: s.rooms,
        activeRoomId: s.activeRoomId,
        apiKey: s.apiKey,
      }),
    },
  ),
);

export const selectActiveRoom = (s: AppStore): Room | undefined =>
  s.rooms.find((r) => r.id === s.activeRoomId);
