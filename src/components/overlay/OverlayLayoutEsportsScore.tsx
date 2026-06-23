import { isSetsLine } from "@/lib/types";
import { elapsedMs, fmtUp } from "@/lib/timer";
import { lineText } from "./parts/helpers";
import type { LayoutProps } from "./parts/types";

/** Esports Score Bar レイアウト: 公式大会風の横長スコアバー(5 セル構成)。
 *  画面上部に固定、放送スタイルの整列。
 *
 *  セル構成:
 *    [ロゴ + ルール] | [自チーム名/役職] | [スコア] | [相手チーム/役職] | [マッチタイマー + 進行]
 *
 *  - スコア: matchLog.records から「勝利マーク有」 = 自勝、それ以外 = 相手勝として集計
 *  - 進行: SET 現在 index / SET 総数 = M3/5 形式
 *  - マッチタイマー: 個別の matchTimer ウィジェットではなく、ここに埋め込む
 *    (matchTimer.enabled に関係なく、settings.matchTimer の状態を読み取り表示) */
export function OverlayLayoutEsportsScore({
  settings,
  setIndex,
  setsLine,
  setsVisible,
}: LayoutProps) {
  const { iconImage, lines, matchTimer, matchLog } = settings;

  // スコア集計: matchLog.records から isPowered (= 通電 = 自チーム勝利) をベースに
  // 通電あり = 1 勝(自側)、通電なし(全滅) = 1 敗(相手側)
  const myWins = (matchLog?.records ?? []).filter((r) => r.isPowered).length;
  const opponentWins = (matchLog?.records ?? []).filter((r) => !r.isPowered).length;

  // SET 進行
  const setsCount = isSetsLine(setsLine ?? ({} as never))
    ? (setsLine?.sets?.length ?? 0)
    : 0;
  const currentSetNo = setsCount > 0 ? setIndex + 1 : 0;

  // マッチタイマー(now を都度計算するため、親の now を貰わず Date.now() で良い)
  const matchTimeStr = matchTimer
    ? fmtUp(elapsedMs(matchTimer, Date.now()) / 1000)
    : "--:--";

  // チーム名 = 各 lines のテキストから推測
  const myTeam = lineText(lines[2]) || "Survivor";
  const opponent = lineText(lines[3]).replace(/^vs\s*/i, "") || "Killer";
  const tournament = lineText(lines[4]) || "Match";
  const title = lineText(lines[1]) || "";

  const cellBase: React.CSSProperties = {
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 64,
  };

  return (
    <div
      className="absolute top-0 left-0 right-0"
      style={{
        background: "linear-gradient(to bottom, rgba(10,10,16,0.92), rgba(10,10,16,0.78))",
        borderBottom: "2px solid rgba(255,179,71,0.55)",
        color: "#fff",
        fontWeight: 800,
        textShadow: "1px 1px 2px rgba(0,0,0,0.85)",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto 1fr auto",
        gap: 0,
      }}
    >
      {/* セル1: ロゴ + 大会名 */}
      <div
        style={{
          ...cellBase,
          borderRight: "1px solid rgba(255,255,255,0.12)",
          alignItems: "center",
          minWidth: 110,
        }}
      >
        {iconImage && (
          <img
            src={iconImage}
            alt=""
            style={{ width: 34, height: 34, objectFit: "contain", marginBottom: 2 }}
          />
        )}
        <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {tournament.slice(0, 16)}
        </span>
      </div>

      {/* セル2: 自チーム + 役職 */}
      <div
        style={{
          ...cellBase,
          alignItems: "flex-end",
          paddingRight: 22,
          textAlign: "right",
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span style={{ fontSize: 19, color: "#7AB6FF" }}>{myTeam}</span>
        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.1em" }}>
          {title.toUpperCase().slice(0, 26)}
        </span>
      </div>

      {/* セル3: スコア中央 */}
      <div
        style={{
          ...cellBase,
          alignItems: "center",
          padding: "10px 24px",
          background: "rgba(255,179,71,0.08)",
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "0.05em",
          }}
        >
          {myWins} <span style={{ opacity: 0.55 }}>-</span> {opponentWins}
        </span>
        {setsCount > 0 && (
          <span style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.12em" }}>
            M{currentSetNo}/{setsCount}
          </span>
        )}
      </div>

      {/* セル4: 相手チーム + 役職 */}
      <div
        style={{
          ...cellBase,
          alignItems: "flex-start",
          paddingLeft: 22,
          textAlign: "left",
          borderRight: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span style={{ fontSize: 19, color: "#FF7A7A" }}>{opponent}</span>
        <span style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.1em" }}>KILLER</span>
      </div>

      {/* セル5: マッチタイマー */}
      <div
        style={{
          ...cellBase,
          alignItems: "center",
          minWidth: 110,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 900,
            fontVariantNumeric: "tabular-nums",
            color: matchTimer?.running ? "#FFB347" : "#fff",
          }}
        >
          ⏱ {matchTimeStr}
        </span>
        {setsLine && setsVisible && isSetsLine(setsLine) && setsLine.sets[setIndex] && (
          <span
            style={{
              fontSize: 10,
              opacity: 0.7,
              letterSpacing: "0.05em",
              maxWidth: 130,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {setsLine.sets[setIndex].killerName}
          </span>
        )}
      </div>
    </div>
  );
}
