import { createContext, useContext, type ReactNode } from "react";
import { useObsConnection, type ObsStatus } from "@/lib/useObsConnection";

type ObsContextValue = {
  status: ObsStatus;
  error: string | null;
  scenes: string[];
  currentScene: string | null;
  setScene: (name: string) => Promise<unknown>;
};

const ObsContext = createContext<ObsContextValue | null>(null);

/** EditorPage で 1 度だけ mount し、子コンポーネントは useObsConnectionContext で参照する。
 *  useObsConnection を複数箇所で呼ぶと WebSocket 接続が複数走るのでこの形にしている。 */
export function ObsConnectionProvider({ children }: { children: ReactNode }) {
  const value = useObsConnection();
  return <ObsContext.Provider value={value}>{children}</ObsContext.Provider>;
}

export function useObsConnectionContext(): ObsContextValue {
  const v = useContext(ObsContext);
  if (!v) {
    // Provider 未配下から呼ばれた場合は安全な no-op を返す(リモコンページ等で踏むケース)
    return {
      status: "idle",
      error: null,
      scenes: [],
      currentScene: null,
      setScene: async () => undefined,
    };
  }
  return v;
}
