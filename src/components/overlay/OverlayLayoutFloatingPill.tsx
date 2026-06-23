import { isSetsLine } from "@/lib/types";
import { RenderText } from "./parts/RenderText";
import { lineText } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

/** Floating Pill レイアウト: 各情報を角丸ピル(丸角カプセル)で個別配置。
 *  半透明 + backdrop-blur で奥行きを演出、個人配信のミニマル系。
 *
 *  - 全要素中央寄せ
 *  - 関連項目を横並び([2段目] vs [3段目] 等)
 *  - 角丸 9999px で完全なピル形状 */
export function OverlayLayoutFloatingPill({
  settings,
  setIndex,
  setFading,
  setsLine,
  setsVisible,
}: LayoutProps) {
  const { iconImage, lines, bilingualStyle } = settings;

  const pillBase: React.CSSProperties = {
    background: "rgba(15, 15, 20, 0.55)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 9999,
    padding: "6px 18px",
    border: "1px solid rgba(255,255,255,0.08)",
    textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
    color: "#fff",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div
      className="absolute top-0 left-0 right-0 p-4 flex flex-col items-center"
      style={{ gap: 8 }}
    >
      {/* 1段目: アイコン + Ladder */}
      {lines[0].visible && (
        <div style={pillBase}>
          {iconImage && (
            <img
              src={iconImage}
              alt=""
              className="object-contain"
              style={{ width: 24, height: 24 }}
            />
          )}
          <div
            className="text-sm tracking-wide"
            style={{ color: lines[0].showBackground ? "#fff" : (lines[0] as { color?: string }).color || "#fff" }}
          >
            <RenderText line={lines[0]} bilingual={bilingualStyle} />
          </div>
        </div>
      )}

      {/* 2段目: 大きなタイトル */}
      {lines[1].visible && lineText(lines[1]) && (
        <div
          style={{
            ...pillBase,
            padding: "10px 28px",
            fontSize: 32,
            fontWeight: 900,
            color: (lines[1] as { color?: string }).color || "#fff",
          }}
        >
          <RenderText line={lines[1]} bilingual={bilingualStyle} />
        </div>
      )}

      {/* 3-4段目: 横並び(対戦相手感) */}
      {(lines[2].visible || lines[3].visible) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {lines[2].visible && lineText(lines[2]) && (
            <div
              style={{
                ...pillBase,
                color: (lines[2] as { color?: string }).color || "#fff",
              }}
            >
              <RenderText line={lines[2]} bilingual={bilingualStyle} />
            </div>
          )}
          {lines[3].visible && lineText(lines[3]) && (
            <div
              style={{
                ...pillBase,
                color: (lines[3] as { color?: string }).color || "#fff",
              }}
            >
              <RenderText line={lines[3]} bilingual={bilingualStyle} />
            </div>
          )}
        </div>
      )}

      {/* 5段目: ルールセット等 */}
      {lines[4].visible && lineText(lines[4]) && (
        <div
          style={{
            ...pillBase,
            color: (lines[4] as { color?: string }).color || "#fff",
          }}
        >
          <RenderText line={lines[4]} bilingual={bilingualStyle} />
        </div>
      )}

      {/* SETライン */}
      {setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex] && (
        <div
          style={{
            ...pillBase,
            opacity: setFading ? 0 : 1,
            transform: setFading ? "translateY(-8px)" : "translateY(0)",
            filter: setFading ? "blur(6px)" : "blur(0)",
            transition: "opacity 850ms ease-out, transform 850ms ease-out, filter 850ms ease-out",
            color: setsLine.color || "#fff",
          }}
        >
          <span style={{ fontWeight: 900 }}>
            ▶SET{setsLine.sets[setIndex].setNumber}
          </span>
          <span style={{ fontWeight: 600, opacity: 0.9 }}>
            {setsLine.sets[setIndex].killerName}（{setsLine.sets[setIndex].playerName}）
          </span>
        </div>
      )}
    </div>
  );
}
