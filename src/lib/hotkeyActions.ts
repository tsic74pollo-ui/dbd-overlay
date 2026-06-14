/**
 * Hotkey / Remote action registry — single source of truth.
 *
 * このテーブルは
 *   1. EditorPage の useHotkeys に直接渡されてキーボード入力を捕捉
 *   2. RemotePage の巨大ボタンが押下時に同じ id を発火
 *   3. useRemoteCommand 経由で受信した command も同じ id にディスパッチ
 * の3つの経路から参照される。アクションを増やすときはここに1行足すだけで
 * 全経路に反映される設計。
 */

import type { AppStore } from "@/store/appStore";

export type RemoteCommand =
  | "timer.toggle" // (互換ID。実体は startResetMatchTimer に変更)
  | "perkCover.release" // (互換ID。実体は startResetPerkTimer に変更)
  | "sets.next"
  | "session.toggle"
  | "room.next"
  | "room.prev";

export type HotkeyAction = {
  /** リモコン送信時のコマンド ID(枝分かれを避けるため URL-safe & dot-notation) */
  id: RemoteCommand;
  /** 表示ラベル(リモコン UI のボタン名 & 押下時バッジ) */
  label: string;
  /** 直近押下時に画面隅に短く出す視覚フィードバック用の短文 */
  shortLabel: string;
  /** 既定のホットキー(KeyboardEvent.key の値) */
  key: string;
  /** どの修飾キーが必要か(なしなら省略) */
  mods?: ("shift" | "ctrl" | "alt")[];
  /** ストアから取得して実行 */
  perform: (store: AppStore) => void;
};

export const HOTKEY_ACTIONS: HotkeyAction[] = [
  {
    id: "timer.toggle",
    label: "マッチタイマー 開始/リセット",
    shortLabel: "Timer",
    key: "t",
    perform: (s) => s.startResetMatchTimer(),
  },
  {
    id: "perkCover.release",
    label: "パーク開放タイマー 開始/リセット",
    shortLabel: "Perk Timer",
    key: "b",
    perform: (s) => s.startResetPerkTimer(),
  },
  {
    id: "sets.next",
    label: "次のSETへ(手動切替モード時)",
    shortLabel: "Next SET",
    key: "m",
    perform: (s) => s.cycleSets(1),
  },
  {
    id: "session.toggle",
    label: "通しタイマー 開始/リセット",
    shortLabel: "Rec Timer",
    key: "r",
    perform: (s) => s.startResetSessionTimer(),
  },
  {
    id: "room.next",
    label: "次のルームへ",
    shortLabel: "Next Room",
    key: "n",
    perform: (s) => s.cycleRoom(1),
  },
  // V2 で再有効化:
  // {
  //   id: "room.prev",
  //   label: "前のルームへ",
  //   shortLabel: "Prev Room",
  //   key: "p",
  //   perform: (s) => s.cycleRoom(-1),
  // },
];

/** id -> action lookup(リモコン受信側で使う) */
export const ACTION_BY_ID: Record<RemoteCommand, HotkeyAction | undefined> =
  HOTKEY_ACTIONS.reduce(
    (acc, a) => {
      acc[a.id] = a;
      return acc;
    },
    {} as Record<RemoteCommand, HotkeyAction | undefined>,
  );
