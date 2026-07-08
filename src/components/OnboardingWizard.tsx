import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Upload, X } from "lucide-react";
import { useAppStore, selectActiveRoom } from "@/store/appStore";
import { PERK_COVER_PRESETS, normalizePerkCover } from "@/lib/defaults";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** 初回起動時に一度だけ自動表示するためのフラグ（閉じたら立てる）。 */
export const ONBOARDED_KEY = "dbd-overlay:onboarded:v1";

type Props = {
  open: boolean;
  onClose: () => void;
};

/**
 * 5分でゼロ→配信のセットアップガイド。
 *   Step 1: 視点(Killer/Survivor) と HUDスケールを選ぶ → パーク隠しの位置が決まる
 *   Step 2: ロゴ画像（任意）
 *   Step 3: OBS Browser Source URL をコピーして貼るだけ
 * Step 2→3 の遷移時に設定を適用するので、URL を貼った瞬間からカバーが乗った状態で映る。
 * 再表示はルームバーの「使い方」ボタンから。
 */
export function OnboardingWizard({ open, onClose }: Props) {
  const room = useAppStore(selectActiveRoom);
  const update = useAppStore((s) => s.updateActiveRoomSettings);

  const [step, setStep] = useState(0);
  const [mirror, setMirror] = useState(false);
  const [presetKey, setPresetKey] = useState(PERK_COVER_PRESETS[0].key);
  const [image, setImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open || !room) return null;

  const preset =
    PERK_COVER_PRESETS.find((p) => p.key === presetKey) ?? PERK_COVER_PRESETS[0];
  const overlayUrl = `${window.location.origin}/overlay?room=${room.id}`;

  // ミニプレビュー上のひし形位置（mirror は描画時だけ x 反転 — 本体と同じ規約）
  const previewX = mirror
    ? Math.max(0, 100 - preset.rect.x - preset.rect.width)
    : preset.rect.x;

  const applySettings = () => {
    update((s) => {
      const pc = normalizePerkCover(s.perkCover);
      return {
        ...s,
        perkCover: {
          ...pc,
          enabled: true,
          mirror,
          x: preset.rect.x,
          y: preset.rect.y,
          width: preset.rect.width,
          height: preset.rect.height,
          image: image ?? pc.image,
          // ガイド経由の初期状態は「未スタート」から始める
          timer: { ...pc.timer, running: false, startedAt: null, accumulatedMs: 0 },
          forceReleased: false,
        },
      };
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const next = () => {
    if (step === 1) applySettings(); // URL を渡す前に配信内容を確定させる
    setStep((v) => Math.min(2, v + 1));
  };
  const back = () => setStep((v) => Math.max(0, v - 1));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">
              セットアップガイド（約5分）
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              ゴースティング対策オーバーレイを OBS に乗せるまで
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-gray-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ステップインジケータ */}
        <div className="flex items-center gap-2 px-5 pt-4">
          {["視点とHUD", "ロゴ（任意）", "OBSに接続"].map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={cn(
                  "h-1 rounded-full",
                  i <= step ? "bg-orange-500" : "bg-gray-700",
                )}
              />
              <div
                className={cn(
                  "mt-1 text-[11px]",
                  i === step ? "text-white font-semibold" : "text-gray-500",
                )}
              >
                {i + 1}. {label}
              </div>
            </div>
          ))}
        </div>

        {/* 本文 */}
        <div className="px-5 py-4 space-y-4 min-h-[290px]">
          {step === 0 && (
            <>
              <p className="text-sm text-gray-300">
                あなたの視点と DBD の HUD スケール設定を選んでください。
                パーク欄を隠すカバーの位置が自動で決まります（後から微調整できます）。
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: false, label: "Killer", sub: "パークは右下" },
                  { v: true, label: "Survivor", sub: "パークは左下" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setMirror(opt.v)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-3 text-left transition",
                      mirror === opt.v
                        ? "border-orange-500 bg-orange-500/15"
                        : "border-gray-700 bg-gray-800 hover:border-gray-500",
                    )}
                  >
                    <div className="text-sm font-bold text-white">{opt.label}</div>
                    <div className="text-xs text-gray-400">{opt.sub}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PERK_COVER_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPresetKey(p.key)}
                    className={cn(
                      "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition",
                      presetKey === p.key
                        ? "border-orange-500 bg-orange-500/15 text-white"
                        : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* ミニプレビュー: カバーが画面のどこに乗るか */}
              <div className="relative aspect-video rounded border border-gray-700 bg-gray-950 overflow-hidden">
                <span className="absolute top-1 left-2 text-[10px] text-gray-600 select-none">
                  1920×1080
                </span>
                <div
                  className="absolute bg-orange-500/80"
                  style={{
                    left: `${previewX}%`,
                    top: `${preset.rect.y}%`,
                    width: `${preset.rect.width}%`,
                    height: `${preset.rect.height}%`,
                    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  }}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-gray-300">
                カバーに表示するロゴや画像があればどうぞ。<strong>スキップしてもOK</strong>
                （単色のひし形カバーになります。後からいつでも設定できます）。
              </p>
              <input
                type="file"
                id="wizard-logo-upload"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
              <label
                htmlFor="wizard-logo-upload"
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-gray-600 px-4 text-sm font-medium text-gray-100 transition-colors hover:border-orange-500 hover:text-white"
              >
                <Upload className="w-4 h-4" />
                画像・ロゴをアップロード
              </label>
              {image && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded border border-gray-700 bg-gray-950 p-2">
                    <img src={image} alt="logo" className="mx-auto h-20 object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setImage(null)}>
                    クリア
                  </Button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-300">
                設定を反映しました。あとは OBS にこの URL を貼るだけです。
              </p>

              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200">
                  {overlayUrl}
                </code>
                <Button size="sm" onClick={copyUrl}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "コピー済" : "コピー"}
                </Button>
              </div>

              <ol className="space-y-1.5 text-sm text-gray-300 list-decimal list-inside">
                <li>OBS で「ソース追加」→「ブラウザ」</li>
                <li>URL に貼り付け、幅 1920 / 高さ 1080</li>
                <li>「表示されていないときにソースをシャットダウン」は OFF</li>
              </ol>

              <div className="rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                ⚠️ 配信中はこのエディタのタブを開いたままにしてください（閉じるとオーバーレイに状態が届かなくなります）。
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
          {step > 0 ? (
            <Button variant="ghost" size="sm" onClick={back}>
              <ChevronLeft className="w-4 h-4" />
              戻る
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onClose}>
              あとで
            </Button>
          )}
          {step < 2 ? (
            <Button size="sm" onClick={next}>
              {step === 1 && !image ? "スキップして次へ" : "次へ"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClose}>
              <Check className="w-4 h-4" />
              完了
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
