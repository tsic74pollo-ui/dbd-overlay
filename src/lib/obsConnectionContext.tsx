import { createContext, useContext, type ReactNode } from "react";
import { useObsConnection, type ObsStatus } from "@/lib/useObsConnection";

type ObsContextValue = {
  status: ObsStatus;
  error: string | null;
  scenes: string[];
  /** OBS の入力ソース名一覧(ゲームキャプチャ・ディスプレイキャプチャ等)。
   *  GetSourceScreenshot で使うのは多くの場合こちら。 */
  inputs: string[];
  currentScene: string | null;
  setScene: (name: string) => Promise<unknown>;
  /** ソースの現在フレームを base64 PNG dataURL で取得(チェイス検知の診断ツール等で使用)。
   *  失敗時(未接続/ソース無し等)は null を返す。 */
  getSourceScreenshot: (
    sourceName: string,
    imageWidth?: number,
    imageHeight?: number,
  ) => Promise<string | null>;
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
      inputs: [],
      currentScene: null,
      setScene: async () => undefined,
      getSourceScreenshot: async () => null,
    };
  }
  return v;
}
