import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LayoutGrid, Sparkles, X } from "lucide-react";
import type { LayoutId, OverlaySettings } from "@/lib/types";
import { LAYOUTS } from "@/components/overlay/layoutRegistry";
import { OverlayView } from "@/components/OverlayView";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
  value: LayoutId;
  settings: OverlaySettings;
  onChange: (layoutId: LayoutId) => void;
};

type LayoutGroup = {
  title: string;
  description: string;
  ids: LayoutId[];
};

const GROUPS: LayoutGroup[] = [
  {
    title: "左上レイアウト",
    description: "ゲーム画面を主役にした、普段使い向け",
    ids: ["classic", "cornerframe", "relay", "tabdeck", "ledger", "matrix", "badge-dock"],
  },
  {
    title: "全幅・中央レイアウト",
    description: "大会配信や待機画面で強く見せる",
    ids: ["floating-pill", "esports-score"],
  },
  {
    title: "画面下レイアウト",
    description: "ゲームHUDとの干渉を避けたい場面向け",
    ids: ["lower-third"],
  },
];

const TRAITS: Record<LayoutId, string[]> = {
  classic: ["左上", "標準"],
  "floating-pill": ["中央", "軽量"],
  "esports-score": ["全幅", "大会向け"],
  "lower-third": ["画面下", "放送調"],
  cornerframe: ["左上", "低占有"],
  relay: ["左上", "競技向け"],
  tabdeck: ["左上", "階層明瞭"],
  ledger: ["左上", "高コントラスト"],
  matrix: ["左上", "コンパクト"],
  "badge-dock": ["左上", "ロゴ重視"],
};

const RECOMMENDED: LayoutId[] = ["cornerframe", "matrix"];

function MiniRows({ stepped = false }: { stepped?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {[58, 48, 68].map((width, index) => (
        <span
          key={width}
          className="block h-1.5 rounded-[1px] bg-slate-200/75"
          style={{ width: `${width}%`, marginLeft: stepped ? index * 5 : 0 }}
        />
      ))}
    </div>
  );
}

function LayoutMiniature({ id }: { id: LayoutId }) {
  const common = "absolute left-[8%] top-[12%] w-[52%]";

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-slate-700/80 bg-[#0B1018]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(65,86,91,.5),transparent_38%),repeating-linear-gradient(45deg,rgba(255,255,255,.025)_0_5px,transparent_5px_10px)]" />

      {id === "classic" && (
        <div className={common}>
          <span className="mb-1 block h-1.5 w-1/3 bg-slate-300/80" />
          <span className="mb-2 block h-3 w-2/3 bg-white/90" />
          <MiniRows />
        </div>
      )}

      {id === "floating-pill" && (
        <div className="absolute inset-x-[18%] top-[13%] flex flex-col items-center gap-1.5">
          <span className="h-2 w-2/5 rounded-full border border-white/25 bg-white/10" />
          <span className="h-4 w-3/4 rounded-full border border-white/25 bg-white/15" />
          <div className="flex w-full justify-center gap-1.5">
            <span className="h-2.5 w-1/3 rounded-full bg-cyan-300/35" />
            <span className="h-2.5 w-1/3 rounded-full bg-red-300/35" />
          </div>
        </div>
      )}

      {id === "esports-score" && (
        <div className="absolute inset-x-0 top-0 grid h-[28%] grid-cols-[14%_1fr_18%_1fr_14%] border-b border-amber-300/60 bg-slate-950/90">
          {[0, 1, 2, 3, 4].map((cell) => (
            <span key={cell} className="border-r border-white/10 last:border-r-0" />
          ))}
        </div>
      )}

      {id === "lower-third" && (
        <div className="absolute inset-x-[11%] bottom-[11%] h-[24%] border-l-4 border-amber-400 bg-gradient-to-r from-slate-950/95 to-slate-950/10 p-2">
          <span className="mb-1 block h-2 w-2/5 bg-white/90" />
          <span className="block h-1.5 w-3/4 bg-slate-300/65" />
        </div>
      )}

      {id === "cornerframe" && (
        <div className={`${common} border-l-2 border-t-2 border-rose-400 pl-2 pt-2`}>
          <span className="mb-1 block h-1.5 w-2/5 bg-slate-300/80" />
          <span className="mb-2 block h-3 w-3/4 bg-white/90" />
          <MiniRows />
        </div>
      )}

      {id === "relay" && (
        <div className={`${common} pl-4`}>
          <span className="absolute bottom-0 left-1 top-0 w-px bg-cyan-300/75" />
          <span className="mb-1 block h-3 w-4/5 border-t border-cyan-300 bg-slate-950/90" />
          {[64, 56, 72].map((width) => (
            <span key={width} className="relative mb-1 block h-2 bg-slate-950/80" style={{ width: `${width}%` }}>
              <i className="absolute -left-[13px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full border border-cyan-300 bg-slate-900" />
            </span>
          ))}
        </div>
      )}

      {id === "tabdeck" && (
        <div className={common}>
          <span className="mb-1 block h-2 w-2/5 bg-rose-500/80" />
          <span className="mb-1.5 block h-3.5 w-4/5 bg-slate-950/95" />
          <MiniRows stepped />
        </div>
      )}

      {id === "ledger" && (
        <div className={`${common} w-[42%] border-t-2 border-rose-500 bg-[#ECE7D9] p-2 shadow-lg`}>
          <span className="mb-1.5 block h-3 w-4/5 bg-slate-900" />
          <div className="space-y-1 border-t border-slate-900/70 pt-1">
            <span className="block h-1.5 w-full bg-slate-900/35" />
            <span className="block h-1.5 w-4/5 bg-slate-900/35" />
            <span className="block h-1.5 w-full bg-slate-900/35" />
          </div>
        </div>
      )}

      {id === "matrix" && (
        <div className={`${common} w-[61%] border border-cyan-300/35 bg-slate-950/85`}>
          <div className="grid h-5 grid-cols-[20%_1fr] border-b border-white/15">
            <span className="bg-cyan-300/80" />
            <span className="m-1.5 bg-white/80" />
          </div>
          <div className="grid h-4 grid-cols-2 border-b border-white/15">
            <span className="border-r border-white/15" />
            <span />
          </div>
          <div className="h-2.5 border-l-2 border-amber-300 bg-amber-300/10" />
        </div>
      )}

      {id === "badge-dock" && (
        <div className={`${common} grid w-[60%] grid-cols-[24%_1fr]`}>
          <span className="relative bg-gradient-to-b from-rose-600 to-rose-950">
            <i className="absolute left-1/2 top-3 h-4 w-4 -translate-x-1/2 rotate-45 border border-white/70" />
          </span>
          <span className="bg-slate-950/85 p-2">
            <i className="mb-2 block h-3 w-3/4 bg-white/85" />
            <MiniRows />
          </span>
        </div>
      )}
    </div>
  );
}

export function LayoutPicker({ value, settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftId, setDraftId] = useState<LayoutId>(value);
  const [previewScale, setPreviewScale] = useState(1 / 3);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const show = () => {
    setDraftId(value);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!open || !stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setPreviewScale(entry.contentRect.width / 1920);
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [open]);

  const apply = () => {
    onChange(draftId);
    close();
  };

  const selectedLayout = LAYOUTS[draftId];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="group flex h-9 min-w-44 items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 text-left text-white transition-[border-color,background-color] duration-200 ease-[cubic-bezier(.4,0,.2,1)] hover:border-cyan-400/70 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#111722] motion-reduce:transition-none"
        title="見た目をプレビューしながらレイアウトを選択"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-cyan-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium leading-none text-slate-400">レイアウト</span>
          <span className="mt-0.5 block truncate text-xs font-semibold">{LAYOUTS[value].label}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-[cubic-bezier(.4,0,.2,1)] group-hover:text-white motion-reduce:transition-none" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="layout-picker-title"
            className="flex max-h-[calc(100vh-32px)] w-full max-w-[1180px] flex-col overflow-hidden rounded-[14px] border border-[#2B3748] bg-[#111722] shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#2B3748] px-5 py-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-cyan-300" />
                  <h2 id="layout-picker-title" className="text-lg font-bold text-[#F4F7FB]">
                    レイアウトを選択
                  </h2>
                  <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                    10種類
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8]">
                  候補を選ぶと、現在のルーム内容で試着できます。「適用」するまで配信には反映されません。
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="レイアウト選択を閉じる"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-400 transition-colors duration-200 ease-[cubic-bezier(.4,0,.2,1)] hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 motion-reduce:transition-none"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[370px_minmax(0,1fr)]">
              <div className="overflow-y-auto border-b border-[#2B3748] p-3 lg:border-b-0 lg:border-r">
                {GROUPS.map((group) => (
                  <section key={group.title} className="mb-5 last:mb-0">
                    <div className="mb-2 px-1">
                      <h3 className="text-xs font-bold text-slate-200">{group.title}</h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">{group.description}</p>
                    </div>
                    <div className="space-y-2">
                      {group.ids.map((id) => {
                        const selected = draftId === id;
                        const current = value === id;
                        const recommended = RECOMMENDED.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setDraftId(id)}
                            aria-pressed={selected}
                            className={cn(
                              "grid w-full grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-[10px] border p-2 text-left transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(.4,0,.2,1)] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-[#111722] motion-reduce:transition-none",
                              selected
                                ? "border-cyan-400 bg-cyan-400/10"
                                : "border-[#2B3748] bg-[#182231] hover:-translate-y-px hover:border-[#46566C] hover:bg-slate-700/50",
                            )}
                          >
                            <LayoutMiniature id={id} />
                            <span className="min-w-0 py-0.5">
                              <span className="flex items-center gap-1.5">
                                <strong className="truncate text-xs text-[#F4F7FB]">{LAYOUTS[id].label}</strong>
                                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-cyan-300" />}
                              </span>
                              <span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-[#94A3B8]">
                                {LAYOUTS[id].description}
                              </span>
                              <span className="mt-2 flex flex-wrap gap-1">
                                {recommended && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-300">
                                    <Sparkles className="h-2.5 w-2.5" /> おすすめ
                                  </span>
                                )}
                                {current && (
                                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                                    使用中
                                  </span>
                                )}
                                {TRAITS[id].map((trait) => (
                                  <span key={trait} className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[9px] text-slate-300">
                                    {trait}
                                  </span>
                                ))}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="flex min-h-0 flex-col overflow-y-auto bg-[#090B10] p-4 lg:p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">Live preview</span>
                    <h3 className="mt-1 text-base font-bold text-[#F4F7FB]">{selectedLayout.label}</h3>
                    <p className="mt-1 text-xs text-[#94A3B8]">{selectedLayout.description}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {TRAITS[draftId].map((trait) => (
                      <span key={trait} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  ref={stageRef}
                  className="relative aspect-video w-full overflow-hidden rounded-[10px] border border-[#2B3748] bg-[repeating-linear-gradient(45deg,#151922_0_14px,#1B202A_14px_28px)] shadow-inner"
                >
                  <div
                    className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left"
                    style={{ transform: `scale(${previewScale})` }}
                  >
                    <OverlayView settings={{ ...settings, layoutId: draftId }} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-slate-800 bg-[#111722] p-2.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">配置</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-200">{TRAITS[draftId][0]}</span>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-[#111722] p-2.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">特徴</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-200">{TRAITS[draftId][1]}</span>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-[#111722] p-2.5">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">データ</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-200">現在のルーム</span>
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[#2B3748] bg-[#111722] px-5 py-3">
              <p className="text-[11px] text-[#94A3B8]">
                現在: <strong className="font-semibold text-slate-200">{LAYOUTS[value].label}</strong>
                {draftId !== value && (
                  <span className="ml-2 text-cyan-300">→ {selectedLayout.label} を試着中</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={close} className="h-9 px-4">
                  キャンセル
                </Button>
                <Button
                  type="button"
                  onClick={apply}
                  disabled={draftId === value}
                  className="h-9 min-w-28 px-4"
                >
                  <Check className="h-4 w-4" />
                  このレイアウトを適用
                </Button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
