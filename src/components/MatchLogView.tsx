import type { CSSProperties } from "react";
import type { MatchLogWidget } from "@/lib/types";
import { cn } from "@/lib/cn";
import { useDraggablePercent } from "@/lib/useDraggablePercent";

type Props = {
  ml: MatchLogWidget;
  editable?: boolean;
  onMove?: (x: number, y: number) => void;
};

const STAGE_SELECTOR = ".overlay-stage";

const hexToRgba = (hex: string, opacity: number): string => {
  if (!hex.startsWith("#") || hex.length < 7) return `rgba(13,13,15,${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${opacity})`;
};

/**
 * オーバーレイ余白に「今日のスクリム結果」 を縦積み表示するウィジェット。
 *   - 完了マッチが上から積まれる(records[0] が最古、最後尾が最新)
 *   - maxVisibleRows を超える古いマッチは折りたたみ/フェード
 *   - 進行中マッチ(currentMatchNo != null) が一番下にハイライト表示
 *   - editable + onMove でプレビュー上ドラッグ可能(他オーバーレイ要素と同じパターン)
 */
export function MatchLogView({ ml, editable, onMove }: Props) {
  const bg = hexToRgba(ml.bgColor, ml.bgOpacity);

  const dragProps = useDraggablePercent({
    current: { x: ml.x, y: ml.y },
    stageSelector: STAGE_SELECTOR,
    onDrag: ({ x, y }) => onMove?.(x, y),
  });

  // 表示対象: 最新 N 件 + 進行中(あれば)
  const recordsToShow = ml.records.slice(-ml.maxVisibleRows);
  const olderCount = Math.max(0, ml.records.length - recordsToShow.length);

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: `${ml.x}%`,
    top: `${ml.y}%`,
    width: `${ml.width}%`,
    fontSize: `${ml.fontScale}em`,
    background: bg,
    padding: "10px 12px",
    borderRadius: 8,
    color: "#fff",
    textShadow: "1px 1px 2px rgba(0,0,0,0.85)",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      className={cn("match-log-widget", editable && onMove && "edit-draggable")}
      style={containerStyle}
      {...(editable && onMove ? dragProps : {})}
    >
      {ml.titleText && (
        <div
          style={{
            fontWeight: 900,
            letterSpacing: "0.08em",
            fontSize: "0.85em",
            color: "#FFB347",
            paddingBottom: 6,
            marginBottom: 6,
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {ml.titleText}
        </div>
      )}

      {olderCount > 0 && (
        <div style={{ fontSize: "0.65em", opacity: 0.55, marginBottom: 4 }}>
          (… 古い {olderCount} 件は折りたたみ)
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {recordsToShow.map((rec) => (
          <MatchLogRow key={rec.matchNo} record={rec} />
        ))}

        {ml.currentMatchNo != null && ml.showCurrentMatchHighlight && (
          <CurrentMatchRow matchNo={ml.currentMatchNo} />
        )}
      </div>
    </div>
  );
}

function MatchLogRow({ record }: { record: MatchLogWidget["records"][number] }) {
  // 右端: 通電なら ✓、そうでなければ G 残数(未指定なら "?")
  const rightCol = record.isPowered ? "✓" : `${record.gensRemaining ?? "?"}G`;
  const rightColor = record.isPowered ? "#7CFC8C" : "#FF7A7A";

  // 余白を最小化する戦略:
  //   justify-content: space-between で M1 / killer-note / K/S / 右端 を均等分散。
  //   - 行右端まで右端コラムが届く(右端余白が消える)
  //   - killer-note が短いと自然に gap が広がるが、右端の巨大空白問題は解消
  //   - killer-note が長いと ellipsis でクリップして他要素に被らない
  //   gap: 12px は最小間隔として担保(密着防止)。
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        fontSize: "0.95em",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 700, color: "#FFB347", opacity: 0.85, flex: "0 0 auto" }}>
        M{record.matchNo}
      </span>
      <span
        style={{
          fontWeight: 700,
          // 0 1 auto = 自然な幅。縮むことはあっても伸びない。
          // これにより flex container の残余白は justify-content: space-between が
          // 3つの隙間に均等分配する(片側に巨大な余白が偏らない)。
          flex: "0 1 auto",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {record.killer}
        {record.note && (
          <span style={{ fontSize: "0.78em", opacity: 0.7, marginLeft: 6 }}>
            {record.note}
          </span>
        )}
      </span>
      <span style={{ fontWeight: 900, color: "#FFFFFF", flex: "0 0 auto" }}>
        {record.kills}K/{record.stages}S
      </span>
      <span
        style={{
          minWidth: "1.6em",
          textAlign: "right",
          color: rightColor,
          fontWeight: 900,
          flex: "0 0 auto",
        }}
      >
        {rightCol}
      </span>
    </div>
  );
}

function CurrentMatchRow({ matchNo }: { matchNo: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "baseline",
        gap: 8,
        fontSize: "0.95em",
        marginTop: 2,
        padding: "3px 6px",
        background: "rgba(255,179,71,0.15)",
        border: "1px solid rgba(255,179,71,0.45)",
        borderRadius: 4,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontWeight: 700, color: "#FFB347" }}>M{matchNo}</span>
      <span style={{ opacity: 0.65, fontStyle: "italic" }}>…稼働中</span>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#FF3B3B",
          alignSelf: "center",
          boxShadow: "0 0 6px rgba(255,59,59,0.85)",
        }}
      />
    </div>
  );
}
