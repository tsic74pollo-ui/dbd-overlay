import { useLayoutEffect, useRef, useState } from "react";
import { isSetsLine } from "@/lib/types";
import { RenderText } from "./parts/RenderText";
import { lineBgStyle, lineColorStyle, lineText, lineWhitespace } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

/** Classic レイアウト(既定): 縦積み・左上集中・背景ブロック式。
 *  V3 以前の唯一のレイアウトをそのまま切出したもの。後方互換のリファレンス実装。 */
export function OverlayLayoutClassic({
  settings,
  setIndex,
  setFading,
  setsLine,
  setsVisible,
}: LayoutProps) {
  const { iconImage, lines } = settings;
  const [maxRowWidth, setMaxRowWidth] = useState(0);
  const [iconSize, setIconSize] = useState(40);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLDivElement | null>(null);

  // Equal width across rows 2-4
  useLayoutEffect(() => {
    const widths = rowRefs.current
      .filter((el): el is HTMLDivElement => el !== null)
      .map((el) => el.scrollWidth);
    if (widths.length > 0) {
      setMaxRowWidth(Math.max(...widths));
    }
  }, [lines]);

  // Icon sizing follows Ladder row height
  useLayoutEffect(() => {
    if (titleRef.current) {
      const h = titleRef.current.offsetHeight;
      setIconSize(Math.max(40, Math.min(h, 80)));
    }
  }, [lines]);

  const middleLines = lines.slice(2, 5);
  const align = settings.align ?? "left";
  const itemsClass =
    align === "center" ? "items-center" : align === "right" ? "items-end" : "items-start";

  return (
    <div className={`absolute top-0 left-0 right-0 p-4 flex flex-col ${itemsClass}`}>
      {lines[0].visible && (
        <div className="flex items-center gap-2 mb-1">
          {iconImage && (
            <img
              src={iconImage}
              alt="Game Icon"
              className="object-contain flex-shrink-0"
              style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
            />
          )}
          <div
            ref={titleRef}
            style={{
              ...lineColorStyle(lines[0]),
              ...lineBgStyle(lines[0]),
              fontWeight: 900,
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
              whiteSpace: lineWhitespace(lines[0]),
              ...(lines[0].showBackground
                ? { paddingLeft: 12, paddingRight: 12, paddingTop: 4, paddingBottom: 4 }
                : {}),
            }}
            className="text-base opacity-90 tracking-wide"
          >
            <RenderText line={lines[0]} bilingual={settings.bilingualStyle} />
          </div>
        </div>
      )}

      {lines[1].visible && lineText(lines[1]) && (
        <div
          style={{
            ...lineColorStyle(lines[1]),
            ...lineBgStyle(lines[1]),
            fontWeight: 900,
            textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
            whiteSpace: lineWhitespace(lines[1]),
            ...(lines[1].showBackground
              ? {
                  paddingLeft: 12,
                  paddingRight: 12,
                  paddingTop: 6,
                  paddingBottom: 6,
                  display: "inline-block",
                }
              : {}),
          }}
          className="text-4xl mb-2 tracking-tight leading-tight"
        >
          <RenderText line={lines[1]} bilingual={settings.bilingualStyle} />
        </div>
      )}

      <div className={`mt-1 space-y-2 flex flex-col ${itemsClass}`}>
        {middleLines.map(
          (line, i) =>
            line.visible &&
            lineText(line) && (
              <div
                key={i + 2}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="py-2.5 text-center inline-block"
                style={{
                  ...lineColorStyle(line),
                  ...lineBgStyle(line),
                  width: maxRowWidth > 0 ? `${maxRowWidth}px` : "auto",
                  fontWeight: 900,
                  textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                  letterSpacing: "0.02em",
                  whiteSpace: lineWhitespace(line),
                  paddingLeft: 20,
                  paddingRight: 20,
                }}
              >
                <RenderText line={line} bilingual={settings.bilingualStyle} />
              </div>
            ),
        )}
      </div>

      {setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex] && (
        <div className={`mt-2 flex flex-col ${itemsClass}`}>
          <div
            className="relative inline-block"
            style={{ overflow: "hidden", ...lineBgStyle(setsLine) }}
          >
            <div
              className="py-2.5 px-5 text-left inline-block relative"
              style={{
                fontWeight: 900,
                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                color: setsLine.color || "#FFFFFF",
                opacity: setFading ? 0 : 1,
                transform: setFading ? "translateY(-100%)" : "translateY(0)",
                filter: setFading ? "blur(8px)" : "blur(0px)",
                transition:
                  "opacity 850ms ease-out, transform 850ms ease-out, filter 850ms ease-out",
                willChange: "opacity, transform, filter",
                zIndex: 1,
              }}
            >
              <span style={{ fontWeight: 900 }}>
                ▶SET{setsLine.sets[setIndex].setNumber}:
              </span>
              <span style={{ fontWeight: 600 }}>
                {setsLine.sets[setIndex].killerName}（{setsLine.sets[setIndex].playerName}）
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
