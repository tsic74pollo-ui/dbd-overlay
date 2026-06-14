import { useEffect, useRef, useState } from "react";
import type { AudioReactiveConfig } from "@/lib/types";

export type AudioStatus =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "error";

const FFT_SIZE = 1024;
const BASS_HZ = 200;
const TREBLE_HZ = 4000;

type Options = {
  enabled: boolean;
  /** EMA smoothing 期間(秒)。大きいほどなめらかに追従する */
  smoothingSec: number;
};

function bandIndices(
  band: AudioReactiveConfig["band"],
  sampleRate: number,
  binCount: number,
): [number, number] {
  const binHz = sampleRate / 2 / binCount;
  if (binHz <= 0) return [0, binCount];
  if (band === "bass") return [0, Math.max(1, Math.floor(BASS_HZ / binHz))];
  if (band === "treble")
    return [Math.min(binCount - 1, Math.floor(TREBLE_HZ / binHz)), binCount];
  return [0, binCount];
}

/**
 * マイク/オーディオ入力をリアルタイムで取得し、
 *  - rawLevel: 0..1 のRMS(調整前。メーター表示用)
 *  - level:    0..1 の閾値・ゲイン適用後の反応度(グロー駆動用)
 *  - status:   接続/許可状態
 * を返す。
 *
 * 使い方:
 *   const { level, rawLevel, status, devices } = useAudioReactive(cfg, { enabled, smoothingSec });
 *
 * 同じ設定で複数回呼ぶと AudioContext が二重起動するので、原則「エディタ(プレビュー用)」と
 * 「OverlayView(本番描画用)」のそれぞれ1インスタンスずつ呼ぶ設計。
 */
export function useAudioReactive(
  cfg: AudioReactiveConfig | null | undefined,
  opts: Options,
): {
  level: number;
  rawLevel: number;
  status: AudioStatus;
  error?: string;
  devices: MediaDeviceInfo[];
  refreshDevices: () => Promise<void>;
} {
  const [level, setLevel] = useState(0);
  const [rawLevel, setRawLevel] = useState(0);
  const [status, setStatus] = useState<AudioStatus>("idle");
  const [error, setError] = useState<string | undefined>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef(0);

  // cfg / smoothingSec を ref に格納してループ内で常に最新を読む(再接続しない)
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const smoothingRef = useRef(opts.smoothingSec);
  smoothingRef.current = opts.smoothingSec;

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput"));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;

    const teardown = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
      analyserRef.current = null;
      smoothedRef.current = 0;
    };

    if (!opts.enabled || !cfg) {
      teardown();
      setStatus("idle");
      setLevel(0);
      setRawLevel(0);
      return () => {
        cancelled = true;
      };
    }

    const loop = () => {
      const analyser = analyserRef.current;
      const ctx = ctxRef.current;
      const c = cfgRef.current;
      if (!analyser || !ctx || !c) return;
      const arr = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(arr);
      const [b0, b1] = bandIndices(c.band, ctx.sampleRate, arr.length);
      let sumSq = 0;
      let n = 0;
      for (let i = b0; i < b1; i++) {
        const v = arr[i] / 255;
        sumSq += v * v;
        n++;
      }
      const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
      const raw = Math.min(1, rms * c.gain);
      // 60fps 想定で smoothingSec を時定数として EMA を更新
      const tau = Math.max(0.02, smoothingRef.current);
      const a = 1 - Math.exp(-1 / (tau * 60));
      smoothedRef.current = smoothedRef.current + a * (raw - smoothedRef.current);
      const th = c.threshold;
      const denom = Math.max(0.0001, 1 - th);
      const active =
        smoothedRef.current < th ? 0 : (smoothedRef.current - th) / denom;
      setRawLevel(smoothedRef.current);
      setLevel(active);
      rafRef.current = requestAnimationFrame(loop);
    };

    const setup = async () => {
      setStatus("requesting");
      try {
        const constraints: MediaStreamConstraints = {
          audio: cfg.deviceId
            ? { deviceId: { exact: cfg.deviceId } }
            : true,
          video: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0; // 自前で EMA するため抑制
        source.connect(analyser);

        ctxRef.current = ctx;
        streamRef.current = stream;
        analyserRef.current = analyser;
        smoothedRef.current = 0;
        setStatus("live");
        setError(undefined);
        await refreshDevices();
        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        const err = e as { name?: string; message?: string };
        setError(err?.message ?? String(e));
        setStatus(err?.name === "NotAllowedError" ? "denied" : "error");
      }
    };

    setup();
    return () => {
      cancelled = true;
      teardown();
    };
    // deviceId 変更時は再接続。それ以外は ref 経由で反映するので接続維持。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.enabled, cfg?.deviceId]);

  return { level, rawLevel, status, error, devices, refreshDevices };
}
