import { isSetsLine } from "@/lib/types";
import { RenderText } from "./parts/RenderText";
import { lineText } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

/** Lower Third レイアウト: 画面下 1/3 配置の TV 報道番組テロップ風。
 *
 *  - `absolute bottom-0` 配置
 *  - 左端の縦線アクセント(`▌` 風の幅広 borderLeft)
 *  - 2 段構成: 上段にタイトル、下段に SET/対戦情報を `│` で並べる
 *  - マウント時に slide-up + fade アニメ */
export function OverlayLayoutLowerThird({
  settings,
  setIndex,
  setFading,
  setsLine,
  setsVisible,
}: LayoutProps) {
  const { iconImage, lines, bilingualStyle } = settings;

  // 下段に並べる情報の節を組み立て(VS / Rules / SET)
  const subItems: { key: string; node: React.ReactNode }[] = [];
  if (lines[3].visible && lineText(lines[3])) {
    subItems.push({
      key: "vs",
      node: (
        <span style={{ color: (lines[3] as { color?: string }).color || "#fff" }}>
          {lineText(lines[3])}
        </span>
      ),
    });
  }
  if (lines[4].visible && lineText(lines[4])) {
    subItems.push({
      key: "rules",
      node: <span style={{ opacity: 0.85 }}>{lineText(lines[4])}</span>,
    });
  }
  if (setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex]) {
    subItems.push({
      key: "set",
      node: (
        <span
          style={{
            color: setsLine.color || "#fff",
            opacity: setFading ? 0 : 1,
            transition: "opacity 600ms ease-out",
            fontWeight: 900,
          }}
        >
          ▶SET{setsLine.sets[setIndex].setNumber}: {setsLine.sets[setIndex].killerName}（
          {setsLine.sets[setIndex].playerName}）
        </span>
      ),
    });
  }

  return (
    <div
      className="absolute left-0 right-0"
      style={{
        bottom: 0,
        padding: "0 14% 6vh",
        animation: "lowerThirdSlideUp 500ms ease-out both",
      }}
    >
      <div
        style={{
          background: "linear-gradient(90deg, rgba(15,15,20,0.92) 0%, rgba(15,15,20,0.75) 80%, rgba(15,15,20,0) 100%)",
          borderLeft: "6px solid #FFB347",
          padding: "14px 22px 14px 24px",
          color: "#fff",
          textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxWidth: "100%",
        }}
      >
        {/* 上段: アイコン + Ladder + Title */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "nowrap" }}>
          {iconImage && (
            <img
              src={iconImage}
              alt=""
              style={{
                width: 28,
                height: 28,
                objectFit: "contain",
                alignSelf: "center",
              }}
            />
          )}
          {lines[0].visible && lineText(lines[0]) && (
            <span
              style={{
                fontSize: 14,
                opacity: 0.78,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: (lines[0] as { color?: string }).color || "#fff",
                fontWeight: 700,
              }}
            >
              <RenderText line={lines[0]} bilingual={bilingualStyle} />
            </span>
          )}
          {lines[1].visible && lineText(lines[1]) && (
            <span
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: (lines[1] as { color?: string }).color || "#fff",
                lineHeight: 1,
              }}
            >
              <RenderText line={lines[1]} bilingual={bilingualStyle} />
            </span>
          )}
        </div>

        {/* 下段: 詳細情報 */}
        {subItems.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 14,
              fontWeight: 700,
              fontSize: 15,
              flexWrap: "wrap",
            }}
          >
            {subItems.map((it, i) => (
              <span key={it.key} style={{ display: "inline-flex", alignItems: "baseline", gap: 14 }}>
                {it.node}
                {i < subItems.length - 1 && (
                  <span style={{ opacity: 0.4, userSelect: "none" }}>│</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
