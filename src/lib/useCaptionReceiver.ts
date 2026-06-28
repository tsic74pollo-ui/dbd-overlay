import { useEffect, useRef, useState } from "react";
import { joinCaptionChannel } from "@/lib/realtimeCaption";
import type { CaptionMessage } from "@/lib/types";

/** /overlay 側で caption:<roomId> を購読し、最新メッセージを返す。
 *  ID 同一の重複受信はスキップ(broadcast の echo / 再受信対策)。
 *
 *  roomId が null/undefined のときは購読しない。 */
export function useCaptionReceiver(roomId: string | null | undefined): {
  incoming: CaptionMessage | null;
} {
  const [incoming, setIncoming] = useState<CaptionMessage | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    const handle = joinCaptionChannel(roomId, "viewer", {
      onMessage: (msg) => {
        // 重複排除(同 ID は無視)
        if (seenIdsRef.current.has(msg.id)) return;
        seenIdsRef.current.add(msg.id);
        // メモリ肥大化を抑えるため古い ID を間引く
        if (seenIdsRef.current.size > 500) {
          const toRemove = Array.from(seenIdsRef.current).slice(0, 250);
          for (const id of toRemove) seenIdsRef.current.delete(id);
        }
        setIncoming(msg);
      },
    });

    return () => {
      handle?.unsubscribe();
    };
  }, [roomId]);

  return { incoming };
}
