import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { joinCommandChannel, type CommandHandle } from "@/lib/realtimeCommand";
import { ACTION_BY_ID } from "@/lib/hotkeyActions";

/**
 * エディタ側のコマンドホスト。全ルーム分のコマンドチャンネルを購読し、
 * リモコンから飛んできた command を受信した瞬間、そのルームを active に切替えてから
 * 対応するストアアクションを実行する。
 *
 * → 「現在見ているルームに関係なく、リモコンURLに紐付いたルームの操作が即反映」
 *   という挙動になる。
 */
export function useRemoteCommandHost(
  onCommandReceived?: (label: string) => void,
) {
  const roomIdsKey = useAppStore((s) => s.rooms.map((r) => r.id).join(","));
  const handles = useRef<Map<string, CommandHandle>>(new Map());

  useEffect(() => {
    const ids = useAppStore.getState().rooms.map((r) => r.id);

    // 追加されたルームに接続
    for (const id of ids) {
      if (handles.current.has(id)) continue;
      const h = joinCommandChannel(id, "host", {
        onCommand: (cmd) => {
          const action = ACTION_BY_ID[cmd];
          if (!action) return;
          // コマンドが届いたルームを active にしてから実行(リモコンURLに対応する挙動)
          const state = useAppStore.getState();
          if (state.activeRoomId !== id) state.setActiveRoom(id);
          action.perform(useAppStore.getState());
          onCommandReceived?.(action.shortLabel);
        },
      });
      if (h) handles.current.set(id, h);
    }

    // 削除されたルームをクリーンアップ
    for (const id of [...handles.current.keys()]) {
      if (ids.includes(id)) continue;
      handles.current.get(id)?.unsubscribe();
      handles.current.delete(id);
    }
  }, [roomIdsKey, onCommandReceived]);

  // unmount で全切断
  useEffect(() => {
    const map = handles.current;
    return () => {
      for (const h of map.values()) h.unsubscribe();
      map.clear();
    };
  }, []);
}
