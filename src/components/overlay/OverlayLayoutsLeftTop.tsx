import type { CSSProperties, ReactNode } from "react";
import type { Line, SetEntry, TextLine } from "@/lib/types";
import { RenderText } from "./parts/RenderText";
import { lineBgStyle, lineColorStyle, lineText } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

const WHITE = "#FFFFFF";
const CYAN = "#58D8FF";
const RED = "#FF6870";
const GOLD = "#F5C35B";

function LeftTopShell({ settings, children }: Pick<LayoutProps, "settings"> & { children: ReactNode }) {
  const align = settings.align ?? "left";
  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  return (
    <div
      className="absolute top-0 left-0 right-0 flex p-4"
      style={{ justifyContent, color: WHITE }}
    >
      {children}
    </div>
  );
}

function visibleText(line: Line | undefined): line is Line {
  return !!line?.visible && !!lineText(line);
}

function activeSet({ setIndex, setsLine, setsVisible }: LayoutProps): SetEntry | null {
  if (!setsVisible || !setsLine) return null;
  return setsLine.sets[setIndex] ?? null;
}

function fadeStyle(setFading: boolean): CSSProperties {
  return {
    opacity: setFading ? 0 : 1,
    transform: setFading ? "translateY(-8px)" : "translateY(0)",
    filter: setFading ? "blur(6px)" : "blur(0)",
    transition:
      "opacity 850ms cubic-bezier(.4,0,.2,1), transform 850ms cubic-bezier(.4,0,.2,1), filter 850ms cubic-bezier(.4,0,.2,1)",
  };
}

function lightThemeColor(line: Line, fallback: string): string {
  const color = (line as TextLine).segments ? undefined : (line as TextLine).color;
  const bg = line.showBackground ? line.backgroundColor : undefined;
  if (bg && /^#[0-9a-f]{6}$/i.test(bg)) {
    const r = Number.parseInt(bg.slice(1, 3), 16);
    const g = Number.parseInt(bg.slice(3, 5), 16);
    const b = Number.parseInt(bg.slice(5, 7), 16);
    if (r * 0.299 + g * 0.587 + b * 0.114 < 128) return color || WHITE;
  }
  return !color || color.toUpperCase() === WHITE ? fallback : color;
}

/** Cornerframe: 背景の占有を抑え、L字フレームで左上へ固定するミニマル案。 */
export function OverlayLayoutCornerframe(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title] = lines;
  const middleLines = lines.slice(2, 5).filter(visibleText);
  const currentSet = activeSet(props);

  return (
    <LeftTopShell settings={settings}>
      <div
        style={{
          position: "relative",
          width: 540,
          padding: "20px 24px 22px 30px",
          textShadow: "0 2px 5px rgba(0,0,0,.92)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 170,
            height: 5,
            background: RED,
            boxShadow: "0 0 8px rgba(255,75,85,.45)",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 5,
            height: 125,
            background: RED,
            boxShadow: "0 0 8px rgba(255,75,85,.45)",
          }}
        />

        {visibleText(eyebrow) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              marginBottom: 8,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: ".19em",
              textTransform: "uppercase",
              ...lineColorStyle(eyebrow),
              ...lineBgStyle(eyebrow),
            }}
          >
            {iconImage && <img src={iconImage} alt="" style={{ width: 26, height: 26, objectFit: "contain" }} />}
            <RenderText line={eyebrow} bilingual={bilingualStyle} />
          </div>
        )}

        {visibleText(title) && (
          <div
            style={{
              marginBottom: 20,
              fontSize: 53,
              lineHeight: 1,
              fontWeight: 900,
              letterSpacing: "-.025em",
              ...lineColorStyle(title),
              ...lineBgStyle(title),
            }}
          >
            <RenderText line={title} bilingual={bilingualStyle} />
          </div>
        )}

        <div style={{ width: 455 }}>
          {middleLines.map((line, index) => (
            <div
              key={lines.indexOf(line)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 13,
                minHeight: 48,
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,.3)",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: ".01em",
                ...lineColorStyle(line),
                ...lineBgStyle(line),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  border: `2px solid ${index === 1 ? CYAN : RED}`,
                  transform: "rotate(45deg)",
                  flex: "none",
                }}
              />
              <RenderText line={line} bilingual={bilingualStyle} />
            </div>
          ))}
        </div>

        {currentSet && setsLine && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              marginTop: 15,
              width: "max-content",
              padding: "9px 18px 9px 11px",
              background: "rgba(8,9,12,.76)",
              borderLeft: `5px solid ${RED}`,
              color: setsLine.color || WHITE,
              fontSize: 20,
              fontWeight: 750,
              boxShadow: "0 8px 22px rgba(0,0,0,.25)",
              ...fadeStyle(setFading),
            }}
          >
            <b style={{ fontSize: 13, letterSpacing: ".12em", color: "#FF9298" }}>
              SET {currentSet.setNumber}
            </b>
            <span>{currentSet.killerName}（{currentSet.playerName}）</span>
          </div>
        )}
      </div>
    </LeftTopShell>
  );
}

/** Relay: ヘッダーから各情報へ伸びる縦レールで進行感を出す案。 */
export function OverlayLayoutRelay(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title] = lines;
  const middleLines = lines.slice(2, 5).filter(visibleText);
  const currentSet = activeSet(props);

  return (
    <LeftTopShell settings={settings}>
      <div style={{ position: "relative", width: 555, textShadow: "0 2px 4px rgba(0,0,0,.9)" }}>
        <div
          style={{
            position: "relative",
            marginLeft: 36,
            padding: "13px 22px 16px",
            background: "rgba(9,11,15,.88)",
            borderTop: `3px solid ${CYAN}`,
            boxShadow: "0 12px 28px rgba(0,0,0,.35)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: -36,
              top: 17,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: CYAN,
              border: "5px solid #19232A",
              boxShadow: `0 0 0 2px ${CYAN}, 0 0 12px rgba(88,216,255,.65)`,
            }}
          />
          {visibleText(eyebrow) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontSize: 14,
                fontWeight: 850,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                ...lineColorStyle(eyebrow),
              }}
            >
              {iconImage && <img src={iconImage} alt="" style={{ width: 25, height: 25, objectFit: "contain" }} />}
              <RenderText line={eyebrow} bilingual={bilingualStyle} />
            </div>
          )}
          {visibleText(title) && (
            <div
              style={{
                marginTop: 3,
                fontSize: 48,
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: "-.02em",
                ...lineColorStyle(title),
                ...lineBgStyle(title),
              }}
            >
              <RenderText line={title} bilingual={bilingualStyle} />
            </div>
          )}
        </div>

        <div style={{ position: "relative", marginTop: 10, paddingLeft: 36, display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 8,
              top: -38,
              bottom: 22,
              width: 2,
              background: `linear-gradient(${CYAN}, rgba(88,216,255,.22) 75%, ${GOLD})`,
            }}
          />
          {middleLines.map((line) => (
            <div
              key={lines.indexOf(line)}
              style={{
                position: "relative",
                width: "max-content",
                minWidth: 420,
                padding: "10px 19px",
                background: "linear-gradient(90deg,rgba(9,11,15,.88),rgba(9,11,15,.53) 78%,transparent)",
                fontSize: 21,
                fontWeight: 800,
                ...lineColorStyle(line),
                ...lineBgStyle(line),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -33,
                  top: "50%",
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: "#151B20",
                  border: `3px solid ${CYAN}`,
                  transform: "translateY(-50%)",
                }}
              />
              <RenderText line={line} bilingual={bilingualStyle} />
            </div>
          ))}
          {currentSet && setsLine && (
            <div
              style={{
                position: "relative",
                marginTop: 5,
                width: "max-content",
                minWidth: 420,
                padding: "10px 19px",
                background: "linear-gradient(90deg,rgba(9,11,15,.88),rgba(9,11,15,.53) 78%,transparent)",
                borderBottom: `2px solid ${GOLD}`,
                color: setsLine.color || WHITE,
                fontSize: 21,
                fontWeight: 800,
                ...fadeStyle(setFading),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -33,
                  top: "50%",
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  background: GOLD,
                  border: `3px solid ${GOLD}`,
                  boxShadow: "0 0 10px rgba(245,195,91,.5)",
                  transform: "translateY(-50%)",
                }}
              />
              <b style={{ color: GOLD, letterSpacing: ".08em" }}>SET {currentSet.setNumber}</b>
              <span>&nbsp;&nbsp;{currentSet.killerName}（{currentSet.playerName}）</span>
            </div>
          )}
        </div>
      </div>
    </LeftTopShell>
  );
}

/** Tabdeck: Classic の縦積み操作感を残し、段差カードで情報階層を表す案。 */
export function OverlayLayoutTabdeck(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title] = lines;
  const middleLines = lines.slice(2, 5).filter(visibleText);
  const currentSet = activeSet(props);
  const accents = [CYAN, RED, "#8B94A0"];

  return (
    <LeftTopShell settings={settings}>
      <div style={{ width: 590, textShadow: "0 2px 4px rgba(0,0,0,.85)" }}>
        {visibleText(eyebrow) && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "7px 14px",
              background: "#B52E38",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              boxShadow: "6px 6px 0 rgba(0,0,0,.35)",
              ...lineColorStyle(eyebrow),
              ...lineBgStyle(eyebrow),
            }}
          >
            {iconImage && <img src={iconImage} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />}
            <RenderText line={eyebrow} bilingual={bilingualStyle} />
          </div>
        )}
        {visibleText(title) && (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "max-content",
              minWidth: 430,
              padding: "13px 24px 15px",
              background: "#11141A",
              borderTop: "1px solid rgba(255,255,255,.17)",
              fontSize: 49,
              lineHeight: 1,
              fontWeight: 900,
              boxShadow: "8px 9px 0 rgba(0,0,0,.35)",
              ...lineColorStyle(title),
              ...lineBgStyle(title),
            }}
          >
            <RenderText line={title} bilingual={bilingualStyle} />
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
          {middleLines.map((line, index) => (
            <div
              key={lines.indexOf(line)}
              style={{
                marginLeft: 12 * (index + 1),
                width: "max-content",
                minWidth: 420,
                padding: "10px 22px 10px 24px",
                background: "rgba(19,22,29,.91)",
                borderLeft: `7px solid ${accents[index]}`,
                fontSize: 21,
                fontWeight: 800,
                boxShadow: "7px 7px 0 rgba(0,0,0,.26)",
                ...lineColorStyle(line),
                ...lineBgStyle(line),
              }}
            >
              <RenderText line={line} bilingual={bilingualStyle} />
            </div>
          ))}
        </div>
        {currentSet && setsLine && (
          <div
            style={{
              margin: "10px 0 0 48px",
              width: "max-content",
              padding: "10px 22px 10px 24px",
              background: "#342B18",
              borderLeft: `7px solid ${GOLD}`,
              color: setsLine.color || WHITE,
              fontSize: 21,
              fontWeight: 800,
              boxShadow: "7px 7px 0 rgba(0,0,0,.26)",
              ...fadeStyle(setFading),
            }}
          >
            <b style={{ color: GOLD, letterSpacing: ".08em" }}>SET {currentSet.setNumber}</b>
            <span>&nbsp;&nbsp;{currentSet.killerName}（{currentSet.playerName}）</span>
          </div>
        )}
      </div>
    </LeftTopShell>
  );
}

/** Ledger: 明るい紙面を使った大会冊子・編集デザイン案。 */
export function OverlayLayoutLedger(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title] = lines;
  const middleLines = lines.slice(2, 5).filter(visibleText);
  const currentSet = activeSet(props);

  return (
    <LeftTopShell settings={settings}>
      <div
        style={{
          width: 500,
          background: "rgba(239,235,222,.96)",
          color: "#111318",
          boxShadow: "13px 15px 0 rgba(0,0,0,.34), 0 25px 55px rgba(0,0,0,.28)",
        }}
      >
        <div style={{ padding: "18px 22px 16px", borderTop: "8px solid #D43842" }}>
          {visibleText(eyebrow) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                color: lightThemeColor(eyebrow, "#63666C"),
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: ".14em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {iconImage && (
                  <img
                    src={iconImage}
                    alt=""
                    style={{
                      width: 24,
                      height: 24,
                      padding: 3,
                      objectFit: "contain",
                      background: "#15171B",
                    }}
                  />
                )}
                <RenderText line={eyebrow} bilingual={bilingualStyle} />
              </span>
              <span style={{ padding: "3px 7px", background: "#15171B", color: "#F3F1E8", fontSize: 10 }}>
                LIVE
              </span>
            </div>
          )}
          {visibleText(title) && (
            <div
              style={{
                marginTop: 7,
                color: lightThemeColor(title, "#111318"),
                fontFamily: '"Arial Narrow", "Roboto Condensed", "Yu Gothic UI", sans-serif',
                fontSize: 52,
                lineHeight: 0.95,
                fontWeight: 900,
                letterSpacing: "-.035em",
              }}
            >
              <RenderText line={title} bilingual={bilingualStyle} />
            </div>
          )}
        </div>
        <div style={{ borderTop: "3px solid #181A1E" }}>
          {middleLines.map((line, index) => (
            <div
              key={lines.indexOf(line)}
              style={{
                display: "grid",
                gridTemplateColumns: "42px 1fr",
                alignItems: "center",
                minHeight: 49,
                borderBottom: "1px solid #A4A198",
                color: lightThemeColor(line, "#111318"),
                fontSize: 20,
                fontWeight: 850,
                ...lineBgStyle(line),
              }}
            >
              <span
                style={{
                  alignSelf: "stretch",
                  display: "grid",
                  placeItems: "center",
                  borderRight: "1px solid #A4A198",
                  color: "#D43842",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span style={{ padding: "9px 16px" }}>
                <RenderText line={line} bilingual={bilingualStyle} />
              </span>
            </div>
          ))}
        </div>
        {currentSet && setsLine && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 15,
              padding: "12px 18px",
              background: "#17191D",
              color: setsLine.color || WHITE,
              fontSize: 19,
              fontWeight: 750,
              ...fadeStyle(setFading),
            }}
          >
            <b style={{ padding: "4px 8px", background: "#D43842", color: WHITE, fontSize: 12, letterSpacing: ".1em" }}>
              SET {currentSet.setNumber}
            </b>
            <span>{currentSet.killerName}（{currentSet.playerName}）</span>
          </div>
        )}
      </div>
    </LeftTopShell>
  );
}

/** Matrix: 2列グリッドで高さを抑えた大会・スクリム向け案。 */
export function OverlayLayoutMatrix(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title, survivor, opponent, rules] = lines;
  const currentSet = activeSet(props);

  const cell = (line: Line | undefined, label: string, wide = false) =>
    visibleText(line) ? (
      <div
        style={{
          gridColumn: wide ? "1 / -1" : undefined,
          minHeight: 59,
          padding: "10px 16px",
          borderRight: wide ? 0 : "1px solid rgba(255,255,255,.12)",
          borderBottom: "1px solid rgba(255,255,255,.12)",
          fontSize: 19,
          fontWeight: 800,
          ...lineColorStyle(line),
          ...lineBgStyle(line),
        }}
      >
        <span
          style={{
            display: "block",
            marginBottom: 3,
            color: "#788490",
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: ".12em",
          }}
        >
          {label}
        </span>
        <RenderText line={line} bilingual={bilingualStyle} />
      </div>
    ) : null;

  return (
    <LeftTopShell settings={settings}>
      <div
        style={{
          width: 680,
          background: "rgba(8,11,16,.83)",
          border: "1px solid rgba(130,217,255,.33)",
          boxShadow: "0 18px 42px rgba(0,0,0,.38)",
          textShadow: "0 2px 4px rgba(0,0,0,.85)",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "74px 1fr", borderBottom: "1px solid rgba(255,255,255,.15)" }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              background: CYAN,
              color: "#071118",
              fontFamily: "ui-monospace, monospace",
              fontSize: 25,
              fontWeight: 900,
            }}
          >
            {iconImage ? <img src={iconImage} alt="" style={{ width: 48, height: 48, objectFit: "contain" }} /> : "IL"}
          </div>
          <div style={{ padding: "12px 18px 14px" }}>
            {visibleText(eyebrow) && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 850,
                  letterSpacing: ".17em",
                  textTransform: "uppercase",
                  ...lineColorStyle(eyebrow),
                }}
              >
                <RenderText line={eyebrow} bilingual={bilingualStyle} />
              </div>
            )}
            {visibleText(title) && (
              <div
                style={{
                  marginTop: 3,
                  fontSize: 43,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: "-.02em",
                  ...lineColorStyle(title),
                  ...lineBgStyle(title),
                }}
              >
                <RenderText line={title} bilingual={bilingualStyle} />
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {cell(survivor, "SURVIVOR")}
          {cell(opponent, "OPPONENT")}
          {cell(rules, "RULESET", true)}
        </div>
        {currentSet && setsLine && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
              padding: "10px 16px",
              borderLeft: `6px solid ${GOLD}`,
              background: "rgba(245,195,91,.08)",
              color: setsLine.color || WHITE,
              fontSize: 18,
              fontWeight: 750,
              ...fadeStyle(setFading),
            }}
          >
            <b style={{ color: GOLD, fontSize: 12, letterSpacing: ".13em", whiteSpace: "nowrap" }}>
              NOW PLAYING · SET {currentSet.setNumber}
            </b>
            <span>{currentSet.killerName}（{currentSet.playerName}）</span>
          </div>
        )}
      </div>
    </LeftTopShell>
  );
}

/** Badge Dock: アップロードされたロゴを大きく扱うブランド重視案。 */
export function OverlayLayoutBadgeDock(props: LayoutProps) {
  const { settings, setFading, setsLine } = props;
  const { iconImage, lines, bilingualStyle } = settings;
  const [eyebrow, title] = lines;
  const middleLines = lines.slice(2, 5).filter(visibleText);
  const currentSet = activeSet(props);

  return (
    <LeftTopShell settings={settings}>
      <div
        style={{
          width: 650,
          display: "grid",
          gridTemplateColumns: "112px 1fr",
          filter: "drop-shadow(0 16px 24px rgba(0,0,0,.34))",
          textShadow: "0 2px 4px rgba(0,0,0,.85)",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            padding: "18px 10px",
            background: "linear-gradient(180deg,#A92935,#61151D)",
            border: "1px solid rgba(255,255,255,.18)",
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              display: "grid",
              placeItems: "center",
              transform: "rotate(45deg)",
              border: "2px solid rgba(255,255,255,.8)",
              background: "rgba(0,0,0,.18)",
              overflow: "hidden",
            }}
          >
            {iconImage ? (
              <img
                src={iconImage}
                alt=""
                style={{ width: 52, height: 52, objectFit: "contain", transform: "rotate(-45deg)" }}
              />
            ) : (
              <span style={{ width: 28, height: 28, border: "4px solid white" }} />
            )}
          </div>
          <small
            style={{
              marginTop: 24,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: ".18em",
              writingMode: "vertical-rl",
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            TEAM SCRIMS
          </small>
        </div>

        <div style={{ background: "linear-gradient(90deg,rgba(10,12,16,.94),rgba(10,12,16,.72) 82%,rgba(10,12,16,.18))", borderTop: "1px solid rgba(255,255,255,.14)" }}>
          <div style={{ padding: "13px 19px 14px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
            {visibleText(eyebrow) && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 850,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  ...lineColorStyle(eyebrow),
                }}
              >
                <RenderText line={eyebrow} bilingual={bilingualStyle} />
              </div>
            )}
            {visibleText(title) && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 44,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: "-.02em",
                  ...lineColorStyle(title),
                  ...lineBgStyle(title),
                }}
              >
                <RenderText line={title} bilingual={bilingualStyle} />
              </div>
            )}
          </div>
          {middleLines.map((line) => (
            <div
              key={lines.indexOf(line)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                minHeight: 45,
                padding: "7px 18px",
                borderBottom: "1px solid rgba(255,255,255,.1)",
                fontSize: 19,
                fontWeight: 800,
                ...lineColorStyle(line),
                ...lineBgStyle(line),
              }}
            >
              <span aria-hidden="true" style={{ width: 14, height: 3, background: RED, flex: "none" }} />
              <RenderText line={line} bilingual={bilingualStyle} />
            </div>
          ))}
          {currentSet && setsLine && (
            <div
              style={{
                padding: "10px 18px",
                background: "rgba(169,41,53,.24)",
                borderBottom: "1px solid rgba(255,104,112,.28)",
                color: setsLine.color || WHITE,
                fontSize: 18,
                fontWeight: 750,
                ...fadeStyle(setFading),
              }}
            >
              <b style={{ marginRight: 10, color: "#FF8C92", letterSpacing: ".1em", fontSize: 12 }}>
                SET {currentSet.setNumber}
              </b>
              {currentSet.killerName}（{currentSet.playerName}）
            </div>
          )}
        </div>
      </div>
    </LeftTopShell>
  );
}
