import { useCallback, useRef, useState } from "react";
import { Activity, Download, RefreshCw, Play, Square } from "lucide-react";
import type { ChaseDiagnosticConfig, ChaseRoi } from "@/lib/types";
import { PRESET_CHASE_ROIS_1080P } from "@/lib/defaults";
import { useObsConnectionContext } from "@/lib/obsConnectionContext";
import {
  useChaseDiagnostic,
  type ChaseDiagnosticSnapshot,
} from "@/lib/useChaseDiagnostic";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/Switch";

type Props = {
  value: ChaseDiagnosticConfig;
  onChange: (next: ChaseDiagnosticConfig) => void;
};

const ROI_COLORS = ["#FF7A7A", "#FFD66B", "#7CFC8C", "#7AB6FF"]; // P1-P4 折れ線色
const GRAPH_WIDTH = 360;
const GRAPH_HEIGHT = 140;
const GRAPH_DURATION_MS = 60_000; // 60秒窓
const MAX_SAMPLES = 1200; // 60秒 × 20FPS 上限

/** チェイス検知の診断ツール UI。検知ロジックは無し、生 motion energy を可視化 + CSV エクスポート。 */
export function ChaseDiagnosticPanel({ value, onChange }: Props) {
  const set = (p: Partial<ChaseDiagnosticConfig>) => onChange({ ...value, ...p });
  const setRoi = (idx: 0 | 1 | 2 | 3, patch: Partial<ChaseRoi>) => {
    const rois = [...value.rois] as ChaseDiagnosticConfig["rois"];
    rois[idx] = { ...rois[idx], ...patch };
    onChange({ ...value, rois });
  };
  const setSurvivorName = (idx: 0 | 1 | 2 | 3, name: string) => {
    const names = [...value.survivorNames] as ChaseDiagnosticConfig["survivorNames"];
    names[idx] = name;
    onChange({ ...value, survivorNames: names });
  };

  const { scenes: obsScenes, status: obsStatus } = useObsConnectionContext();
  const [liveRaw, setLiveRaw] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [liveSmoothed, setLiveSmoothed] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  // 60秒折れ線グラフ用サンプル(揮発、store には保存しない)
  const samplesRef = useRef<ChaseDiagnosticSnapshot[]>([]);
  // 記録モード: 押下から「ストップ」 まで全サンプル蓄積
  const [recording, setRecording] = useState(false);
  const recordedRef = useRef<ChaseDiagnosticSnapshot[]>([]);

  // SVG 折れ線の再描画トリガ
  const [, setGraphTick] = useState(0);

  const handleTick = useCallback(
    (snap: ChaseDiagnosticSnapshot) => {
      setLiveRaw(snap.raw);
      setLiveSmoothed(snap.smoothed);

      // 直近 60秒分のサンプルを保持
      samplesRef.current.push(snap);
      const cutoff = snap.atMs - GRAPH_DURATION_MS;
      while (
        samplesRef.current.length > 0 &&
        samplesRef.current[0].atMs < cutoff
      ) {
        samplesRef.current.shift();
      }
      if (samplesRef.current.length > MAX_SAMPLES) {
        samplesRef.current = samplesRef.current.slice(-MAX_SAMPLES);
      }

      // 記録中なら別 ref にも残す(エクスポート用、60秒窓を超えても保持)
      if (recording) {
        recordedRef.current.push(snap);
      }

      // 250ms ごとに re-render(60FPS で setGraphTick 連発を回避)
      const shouldRender =
        samplesRef.current.length < 4 ||
        snap.atMs - samplesRef.current[samplesRef.current.length - 4].atMs >= 250;
      if (shouldRender) setGraphTick((n) => n + 1);
    },
    [recording],
  );

  useChaseDiagnostic(value, handleTick);

  const handleLoadPreset = () => {
    const rois = [
      { ...PRESET_CHASE_ROIS_1080P[0] },
      { ...PRESET_CHASE_ROIS_1080P[1] },
      { ...PRESET_CHASE_ROIS_1080P[2] },
      { ...PRESET_CHASE_ROIS_1080P[3] },
    ] as ChaseDiagnosticConfig["rois"];
    onChange({ ...value, rois });
  };

  const handleStartRecord = () => {
    recordedRef.current = [];
    setRecording(true);
  };

  const handleStopRecord = () => {
    setRecording(false);
  };

  const handleExportCsv = () => {
    const data = recordedRef.current;
    if (data.length === 0) {
      alert("記録データがありません。「記録開始」 で蓄積してからエクスポートしてください。");
      return;
    }
    const t0 = data[0].atMs;
    const header = [
      "time_sec",
      ...value.survivorNames.map((n) => `${n}_raw`),
      ...value.survivorNames.map((n) => `${n}_smoothed`),
    ].join(",");
    const lines = data.map((s) => {
      const t = ((s.atMs - t0) / 1000).toFixed(3);
      return [
        t,
        ...s.raw.map((v) => v.toFixed(2)),
        ...s.smoothed.map((v) => v.toFixed(2)),
      ].join(",");
    });
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chase-diagnostic-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // SVG 折れ線描画: 各 ROI の smoothed 値を時系列で
  const renderGraph = () => {
    const samples = samplesRef.current;
    if (samples.length < 2) {
      return (
        <div
          className="flex items-center justify-center text-xs text-gray-500"
          style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT }}
        >
          (有効化 + OBS 接続後にグラフが描画されます)
        </div>
      );
    }
    const t1 = samples[samples.length - 1].atMs;
    const t0 = t1 - GRAPH_DURATION_MS;

    // Y 軸スケール: 直近サンプルの最大値の 1.2 倍を上限に(自動レンジ)
    const maxVal = Math.max(
      ...samples.flatMap((s) => s.smoothed),
      10, // 最低スケール
    );
    const yMax = maxVal * 1.2;

    const x = (atMs: number) =>
      ((atMs - t0) / GRAPH_DURATION_MS) * GRAPH_WIDTH;
    const y = (v: number) => GRAPH_HEIGHT - (v / yMax) * GRAPH_HEIGHT;

    return (
      <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} className="bg-gray-900 rounded">
        {/* グリッド */}
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            x2={GRAPH_WIDTH}
            y1={GRAPH_HEIGHT * t}
            y2={GRAPH_HEIGHT * t}
            stroke="rgba(255,255,255,0.06)"
          />
        ))}
        {/* 各 ROI の折れ線 */}
        {[0, 1, 2, 3].map((i) => {
          const path = samples
            .map((s, idx) => {
              const px = x(s.atMs);
              const py = y(s.smoothed[i]);
              return `${idx === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
            })
            .join(" ");
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke={ROI_COLORS[i]}
              strokeWidth={1.5}
              opacity={0.85}
            />
          );
        })}
        {/* 凡例 */}
        <g transform={`translate(${GRAPH_WIDTH - 110},6)`}>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(0,${i * 14})`}>
              <rect width={10} height={10} fill={ROI_COLORS[i]} />
              <text
                x={14}
                y={9}
                fill="#fff"
                style={{ fontSize: 10, fontFamily: "monospace" }}
              >
                {value.survivorNames[i]}
              </text>
            </g>
          ))}
        </g>
        {/* Y 軸最大値 */}
        <text
          x={4}
          y={12}
          fill="rgba(255,255,255,0.4)"
          style={{ fontSize: 10, fontFamily: "monospace" }}
        >
          max {yMax.toFixed(1)}
        </text>
      </svg>
    );
  };

  return (
    <div className="space-y-3 p-4 bg-gray-800 rounded">
      <div className="flex items-center justify-between">
        <Label className="text-white font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-300" />
          チェイス検知 診断ツール(Phase 1 / 実データ収集用)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-white text-sm">有効化</Label>
          <Switch checked={value.enabled} onCheckedChange={(v) => set({ enabled: v })} />
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-snug">
        OBS のゲーム画面から 4 サバイバーのポートレート右隣 (オブセ/ミニオブセUI 表示エリア) の
        motion energy を可視化します。検知ロジックは未実装で、生データを CSV エクスポートして
        Phase 2 設計の根拠に使います。
      </p>

      {value.enabled && (
        <>
          {/* OBS ソース選択 */}
          <div className="space-y-1">
            <Label className="text-white text-sm">
              OBS ゲームソース名
              {obsStatus !== "live" && (
                <span className="text-amber-300 text-xs ml-2">⚠ OBS 未接続</span>
              )}
            </Label>
            {obsStatus === "live" && obsScenes.length > 0 ? (
              <select
                value={value.obsSourceName}
                onChange={(e) => set({ obsSourceName: e.target.value })}
                className="w-full h-9 rounded border border-gray-600 bg-gray-700 px-2 text-sm text-white"
              >
                <option value="">(未選択)</option>
                {obsScenes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={value.obsSourceName}
                onChange={(e) => set({ obsSourceName: e.target.value })}
                placeholder="ソース名(OBS 接続後にドロップダウンになる)"
                className="font-mono text-sm"
              />
            )}
            <p className="text-xs text-gray-500">
              ※ OBS シーン名ではなくゲームキャプチャ等の ソース名 を指定
            </p>
          </div>

          {/* ROI 設定 */}
          <div className="space-y-2 p-3 bg-gray-750 rounded">
            <div className="flex items-center justify-between">
              <Label className="text-white text-sm font-semibold">
                ROI 設定(4 サバイバー)
              </Label>
              <Button size="sm" variant="outline" onClick={handleLoadPreset}>
                <RefreshCw className="w-3 h-3" />
                1080p 既定にリセット
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400">
                  <th className="text-left">#</th>
                  <th className="text-left">名前</th>
                  <th className="text-right">x</th>
                  <th className="text-right">y</th>
                  <th className="text-right">w</th>
                  <th className="text-right">h</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="pr-1">
                      <span style={{ color: ROI_COLORS[i], fontWeight: 900 }}>●</span>
                    </td>
                    <td className="pr-1">
                      <Input
                        value={value.survivorNames[i]}
                        onChange={(e) =>
                          setSurvivorName(i as 0 | 1 | 2 | 3, e.target.value)
                        }
                        className="h-7 text-xs bg-gray-700 border-gray-600 w-20"
                      />
                    </td>
                    {(["x", "y", "width", "height"] as const).map((k) => (
                      <td key={k} className="pl-1">
                        <Input
                          type="number"
                          value={value.rois[i][k]}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isNaN(v))
                              setRoi(i as 0 | 1 | 2 | 3, { [k]: v });
                          }}
                          className="h-7 text-xs bg-gray-700 border-gray-600 w-14 text-right"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ポーリング設定 */}
          <div className="space-y-1">
            <Label className="text-white text-sm">
              ポーリング FPS: {value.pollingFps}
            </Label>
            <input
              type="range"
              min={2}
              max={15}
              step={1}
              value={value.pollingFps}
              onChange={(e) => set({ pollingFps: parseInt(e.target.value, 10) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              高いほど精度↑だが OBS WebSocket への負荷↑。5-10 推奨
            </p>
          </div>

          <div className="flex items-center justify-between p-2 bg-gray-750 rounded">
            <div>
              <Label className="text-white text-xs">黄色フィルタ</Label>
              <p className="text-xs text-gray-500">
                スキルチェック等の黄/オレンジを誤検知から除外
              </p>
            </div>
            <Switch
              checked={value.yellowFilter}
              onCheckedChange={(v) => set({ yellowFilter: v })}
            />
          </div>

          {/* ライブバー */}
          <div className="space-y-1 p-3 bg-gray-900 rounded font-mono text-xs">
            <Label className="text-gray-300 text-xs">ライブ motion energy</Label>
            {[0, 1, 2, 3].map((i) => {
              const v = liveSmoothed[i];
              const r = liveRaw[i];
              const barW = Math.min(100, (v / 30) * 100); // 30 を 100% とする見やすさ重視スケール
              return (
                <div key={i} className="flex items-center gap-2">
                  <span style={{ color: ROI_COLORS[i], width: 80 }}>
                    {value.survivorNames[i]}
                  </span>
                  <div className="flex-1 h-3 bg-gray-700 rounded overflow-hidden">
                    <div
                      style={{
                        width: `${barW}%`,
                        background: ROI_COLORS[i],
                        height: "100%",
                        transition: "width 100ms linear",
                      }}
                    />
                  </div>
                  <span style={{ color: "#fff", width: 60, textAlign: "right" }}>
                    {v.toFixed(1)}
                    <span style={{ color: "#888", marginLeft: 4 }}>
                      ({r.toFixed(1)})
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* 60秒グラフ */}
          <div className="space-y-1">
            <Label className="text-gray-300 text-xs">直近 60 秒 ({samplesRef.current.length} samples)</Label>
            <div>{renderGraph()}</div>
          </div>

          {/* 記録 + エクスポート */}
          <div className="flex gap-2">
            {!recording ? (
              <Button size="sm" className="flex-1" onClick={handleStartRecord}>
                <Play className="w-3.5 h-3.5" />
                記録開始
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                className="flex-1"
                onClick={handleStopRecord}
              >
                <Square className="w-3.5 h-3.5" />
                記録停止 ({recordedRef.current.length} samples)
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              disabled={recordedRef.current.length === 0}
            >
              <Download className="w-3.5 h-3.5" />
              CSV エクスポート
            </Button>
          </div>

          <p className="text-xs text-gray-500 leading-snug">
            💡 実機 DBD で 1 マッチプレイしながら記録 → CSV を Claude に送信 →
            Phase 2 (検知ロジック実装) の GO/NO-GO 判定に使います。
          </p>
        </>
      )}
    </div>
  );
}
