import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/appStore";
import { joinCaptionChannel, type CaptionHandle } from "@/lib/realtimeCaption";
import type { CaptionMessage } from "@/lib/types";
import { useLocalVocalContext } from "@/lib/localVocalContext";

/** エディタ側で LocalVocal から受信した字幕を全ルームの caption:<roomId> へ broadcast する。
 *  EditorPage で 1 度だけ mount する想定。 */
export function useCaptionPublisher() {
  const { incoming } = useLocalVocalContext();
  const roomIds = useAppStore((s) => s.rooms.map((r) => r.id).join(","));

  const handlesRef = useRef<Map<string, CaptionHandle>>(new Map());
  const lastSentIdRef = useRef<string | null>(null);

  // ルームの追加/削除に追従して channel を開閉
  useEffect(() => {
    const ids = useAppStore.getState().rooms.map((r) => r.id);

    // 新規ルーム → 接続
    for (const id of ids) {
      if (handlesRef.current.has(id)) continue;
      const h = joinCaptionChannel(id, "publisher", {
        // publisher 側は受信不要
      });
      if (h) handlesRef.current.set(id, h);
    }
    // 消えたルーム → 切断
    for (const id of [...handlesRef.current.keys()]) {
      if (ids.includes(id)) continue;
      handlesRef.current.get(id)?.unsubscribe();
      handlesRef.current.delete(id);
    }

    return () => {
      // 何もしない(unmount は別の effect で)
    };
  }, [roomIds]);

  // 受信メッセージを全ルームへ broadcast
  useEffect(() => {
    if (!incoming) return;
    // 同 ID は二度 broadcast しない
    if (lastSentIdRef.current === incoming.id) return;
    lastSentIdRef.current = incoming.id;
    for (const h of handlesRef.current.values()) {
      h.publish(incoming as CaptionMessage);
    }
  }, [incoming]);

  // unmount で全切断
  useEffect(() => {
    const map = handlesRef.current;
    return () => {
      for (const h of map.values()) h.unsubscribe();
      map.clear();
    };
  }, []);
}
