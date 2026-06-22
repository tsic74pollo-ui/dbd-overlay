import { useEffect, useRef, useState } from "react";
import OBSWebSocket from "obs-websocket-js";
import { useAppStore } from "@/store/appStore";

export type ObsStatus = "idle" | "connecting" | "live" | "error";

/**
 * OBS WebSocket(v5) 連携フック。EditorPage で 1 回 mount される前提。
 *
 * 役割:
 *   - obs config (enabled / url / password) の変化に応じて接続を張り直す
 *   - 接続中に activeRoomId が変わったら、target ルームの obsSceneName へ OBS シーンを切替
 *   - シーン一覧と現在シーン名を購読(UI のドロップダウン用)
 *   - 自動再接続(2s → 4s → 8s … 最大 30s の指数バックオフ)
 *
 * ストアからは副作用呼び出ししない設計(ストアは状態の単一情報源、副作用は hook で扱う)。
 */
export function useObsConnection() {
  const config = useAppStore((s) => s.obs);

  const obsRef = useRef<OBSWebSocket | null>(null);
  const stoppedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const statusRef = useRef<ObsStatus>("idle");

  const [status, setStatusState] = useState<ObsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<string[]>([]);
  const [inputs, setInputs] = useState<string[]>([]); // OBS の入力ソース(ゲームキャプチャ等)
  const [currentScene, setCurrentScene] = useState<string | null>(null);

  const setStatus = (s: ObsStatus) => {
    statusRef.current = s;
    setStatusState(s);
  };

  // 接続/再接続ロジック
  useEffect(() => {
    stoppedRef.current = false;

    const cleanup = async () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (obsRef.current) {
        try {
          await obsRef.current.disconnect();
        } catch {
          /* ignore */
        }
        obsRef.current = null;
      }
      setStatus("idle");
      setScenes([]);
      setCurrentScene(null);
      setError(null);
    };

    if (!config.enabled || !config.url) {
      void cleanup();
      return () => {
        stoppedRef.current = true;
      };
    }

    // 入力ソース(ゲームキャプチャ等)一覧を取得して state に反映する
    const refreshInputs = async (obs: OBSWebSocket) => {
      try {
        const res = await obs.call("GetInputList");
        // inputs は [{ inputName, inputKind, ... }] の配列
        const names = (res.inputs ?? [])
          .map((it) => String((it as { inputName?: string }).inputName ?? ""))
          .filter((s) => s.length > 0);
        setInputs(names);
      } catch {
        /* ignore */
      }
    };

    const scheduleRetry = () => {
      if (stoppedRef.current) return;
      const delay = Math.min(30_000, 2_000 * Math.pow(2, retryCountRef.current));
      retryCountRef.current += 1;
      retryTimerRef.current = window.setTimeout(connect, delay);
    };

    const connect = async () => {
      if (stoppedRef.current) return;
      // 既存接続を破棄してから張り直す(state を残さない)
      if (obsRef.current) {
        try {
          await obsRef.current.disconnect();
        } catch {
          /* ignore */
        }
        obsRef.current = null;
      }

      const obs = new OBSWebSocket();
      obsRef.current = obs;
      setStatus("connecting");
      setError(null);

      obs.on("ConnectionClosed", () => {
        if (stoppedRef.current) return;
        // ユーザーが OBS 落とした等。再接続をスケジュール。
        setStatus("connecting");
        scheduleRetry();
      });
      obs.on("CurrentProgramSceneChanged", (data) => {
        setCurrentScene(data.sceneName);
      });
      obs.on("SceneListChanged", async () => {
        try {
          const list = await obs.call("GetSceneList");
          setScenes(list.scenes.map((s) => String(s.sceneName)).reverse());
        } catch {
          /* ignore */
        }
      });
      // 入力ソース(ゲームキャプチャ・ディスプレイキャプチャ等)の追加/削除を購読
      obs.on("InputCreated", () => {
        void refreshInputs(obs);
      });
      obs.on("InputRemoved", () => {
        void refreshInputs(obs);
      });
      obs.on("InputNameChanged", () => {
        void refreshInputs(obs);
      });

      try {
        await obs.connect(config.url, config.password || undefined);
        retryCountRef.current = 0;
        setStatus("live");

        // 接続直後にシーン一覧 + 現在シーン + 入力ソース一覧を取得
        const list = await obs.call("GetSceneList");
        // OBS は順序が逆向きで返ってくる(上から下) ので reverse して見やすく
        setScenes(list.scenes.map((s) => String(s.sceneName)).reverse());
        setCurrentScene(String(list.currentProgramSceneName));
        await refreshInputs(obs);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStatus("error");
        scheduleRetry();
      }
    };

    void connect();

    return () => {
      stoppedRef.current = true;
      void cleanup();
    };
  }, [config.enabled, config.url, config.password]);

  // activeRoomId の変化を購読 → 該当ルームの obsSceneName へ切替
  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.activeRoomId === prev.activeRoomId) return;
      const room = state.rooms.find((r) => r.id === state.activeRoomId);
      const target = room?.obsSceneName?.trim();
      if (!target) return;
      const obs = obsRef.current;
      if (!obs || statusRef.current !== "live") return;
      obs
        .call("SetCurrentProgramScene", { sceneName: target })
        .catch(() => {
          // シーン名が無効/OBS が落ちている等。CurrentProgramSceneChanged で復帰検知できる。
        });
    });
    return unsub;
  }, []);

  // 手動でシーンを切替するためのヘルパー(UI 確認ボタン用)
  const setScene = (name: string) => {
    const obs = obsRef.current;
    if (!obs || statusRef.current !== "live") return Promise.resolve();
    return obs.call("SetCurrentProgramScene", { sceneName: name });
  };

  /** OBS ソースの現在フレームを base64 PNG dataURL で取得する。
   *  チェイス検知の診断ツール等で、ゲーム画面の一部領域を解析するために使う。
   *  obs-websocket v5 の GetSourceScreenshot を呼び出す。
   *  失敗時は null を返す(エラー伝播せずポーリングループを止めない)。 */
  const getSourceScreenshot = async (
    sourceName: string,
    imageWidth?: number,
    imageHeight?: number,
  ): Promise<string | null> => {
    const obs = obsRef.current;
    if (!obs || statusRef.current !== "live") return null;
    try {
      const res = await obs.call("GetSourceScreenshot", {
        sourceName,
        imageFormat: "png",
        ...(imageWidth ? { imageWidth } : {}),
        ...(imageHeight ? { imageHeight } : {}),
      });
      return res.imageData;
    } catch {
      return null;
    }
  };

  return {
    status,
    error,
    scenes,
    inputs,
    currentScene,
    setScene,
    getSourceScreenshot,
  };
}
