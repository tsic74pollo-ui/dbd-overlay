import { isSetsLine } from "@/lib/types";
import { lineText } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

/** Minimal Top Bar レイアウト: 画面最上部 1 行に全情報を凝縮、`│` セパレータで区切り。
 *  競技配信・画面占有最小化向け。
 *
 *  - lines[0] (Ladder) / lines[1] (Title) / lines[3] (VS) / lines[4] (Rules) / setsLine[current]
 *  - 細い下線で領域定義
 *  - 縦スペース 95% をゲームに譲る */
export function OverlayLayoutMinimalBar({
  settings,
  setIndex,
  setFading,
  setsLine,
  setsVisible,
}: LayoutProps) {
  const { iconImage, lines } = settings;

  // 表示する行のサブセット(順番固定)
  const items: { key: string; node: React.ReactNode }[] = [];

  if (lines[0].visible && lineText(lines[0])) {
    items.push({
      key: "ladder",
      node: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {iconImage && (
            <img
              src={iconImage}
              alt=""
              style={{ width: 18, height: 18, objectFit: "contain" }}
            />
          )}
          <span>{lineText(lines[0])}</span>
        </span>
      ),
    });
  }
  if (lines[1].visible && lineText(lines[1])) {
    items.push({
      key: "title",
      node: (
        <span
          style={{
            fontWeight: 900,
            color: (lines[1] as { color?: string }).color || "#fff",
          }}
        >
          {lineText(lines[1])}
        </span>
      ),
    });
  }
  if (lines[3].visible && lineText(lines[3])) {
    items.push({
      key: "vs",
      node: <span style={{ color: (lines[3] as { color?: string }).color || "#fff" }}>{lineText(lines[3])}</span>,
    });
  }
  if (lines[4].visible && lineText(lines[4])) {
    items.push({
      key: "rules",
      node: <span style={{ opacity: 0.85 }}>{lineText(lines[4])}</span>,
    });
  }
  if (setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex]) {
    items.push({
      key: "set",
      node: (
        <span
          style={{
            color: setsLine.color || "#fff",
            opacity: setFading ? 0 : 1,
            transition: "opacity 600ms ease-out",
          }}
        >
          ▶SET{setsLine.sets[setIndex].setNumber}: {setsLine.sets[setIndex].killerName}
          （{setsLine.sets[setIndex].playerName}）
        </span>
      ),
    });
  }

  return (
    <div
      className="absolute top-0 left-0 right-0"
      style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.62), rgba(0,0,0,0.32))",
        borderBottom: "1px solid rgba(255,255,255,0.18)",
        padding: "10px 18px",
        color: "#fff",
        fontWeight: 700,
        textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
        fontSize: 16,
        letterSpacing: "0.02em",
        display: "flex",
        alignItems: "center",
        gap: 14,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {items.map((it, i) => (
        <span key={it.key} style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
          {it.node}
          {i < items.length - 1 && (
            <span style={{ opacity: 0.35, userSelect: "none" }}>│</span>
          )}
        </span>
      ))}
    </div>
  );
}
