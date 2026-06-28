import { createContext, useContext, type ReactNode } from "react";
import { useAppStore } from "@/store/appStore";
import {
  useLocalVocalConnection,
  type LocalVocalStatus,
} from "@/lib/useLocalVocalConnection";
import type { CaptionMessage } from "@/lib/types";

type LocalVocalContextValue = {
  status: LocalVocalStatus;
  error: string | null;
  incoming: CaptionMessage | null;
};

const LocalVocalContext = createContext<LocalVocalContextValue | null>(null);

/** EditorPage で 1 度だけ mount。useLocalVocalConnection を複数箇所で呼ぶと
 *  WebSocket が複数走るのでこの形に集約。 */
export function LocalVocalProvider({ children }: { children: ReactNode }) {
  const config = useAppStore((s) => s.localVocal);
  const value = useLocalVocalConnection(config);
  return (
    <LocalVocalContext.Provider value={value}>
      {children}
    </LocalVocalContext.Provider>
  );
}

export function useLocalVocalContext(): LocalVocalContextValue {
  const v = useContext(LocalVocalContext);
  if (!v) {
    return {
      status: "idle",
      error: null,
      incoming: null,
    };
  }
  return v;
}
