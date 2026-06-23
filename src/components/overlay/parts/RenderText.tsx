import type { BilingualStyle, Line, TextLine } from "@/lib/types";
import { defaultBilingualStyle } from "@/lib/defaults";

export const RenderText = ({
  line,
  bilingual,
}: {
  line: Line;
  bilingual?: BilingualStyle;
}) => {
  const t = line as TextLine;
  // 第二テキスト(secondaryText)があり、かつバイリンガルスタイルが取得できれば主+副の2段で描画。
  // 複数色モード(segments)では従来通り単行(secondaryText は無視)。
  const secondary = (!t.segments && (t.secondaryText ?? "").trim()) || null;
  const bs = bilingual ?? defaultBilingualStyle();

  if (t.segments && t.segments.length > 0) {
    return (
      <>
        {t.segments.map((s, i) => (
          <span key={i} style={{ color: s.color }}>
            {s.text}
          </span>
        ))}
      </>
    );
  }
  const text = t.text || "";
  const lines = text.split("\n");
  const primary = (
    <>
      {lines.map((part, i) => (
        <span key={i}>
          {part}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
  if (!secondary) return primary;
  return (
    <>
      {primary}
      <div
        style={{
          fontSize: `${bs.scale}em`,
          color: bs.color,
          marginTop: `${bs.gapEm}em`,
          fontWeight: 700,
          letterSpacing: "0.04em",
          whiteSpace: secondary.includes("\n") ? "pre" : "nowrap",
        }}
      >
        {secondary.split("\n").map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </>
  );
};
