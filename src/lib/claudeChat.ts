import Anthropic from "@anthropic-ai/sdk";
import type { OverlaySettings } from "./types";

const SYSTEM_PROMPT = `あなたはゲーム配信用オーバーレイの設定を更新する専門アシスタントです。

ユーザーの指示に従って、与えられた OverlaySettings JSON を更新し、**更新後の OverlaySettings 全体を JSON で返します**。

# OverlaySettings の構造

\`\`\`ts
type Segment = { text: string; color: string };
type Line = {
  visible: boolean;
  showBackground?: boolean;
  backgroundColor?: string;     // 例: "#2D2D2D"
  backgroundOpacity?: number;   // 0..1
  text?: string;                 // 単色モード
  color?: string;                // 例: "#FFFFFF"
  segments?: Segment[];          // 複数色モード（存在すれば優先）
  sets?: { setNumber: number; killerName: string; playerName: string }[]; // 最後の行のみ
};
type OverlaySettings = {
  iconImage: string;
  lines: Line[];
  align?: "left" | "center" | "right";  // 整列。省略時は "left"。中央/右に変えると全行の背景ブロックごと移動する
  perkCover?: {                            // 右下のパーク隠しカバー（任意・存在すれば触ってよい）
    enabled: boolean;
    x: number; y: number; width: number; height: number; // すべて 0..100 の %
    backgroundColor: string;
    opacity: number;                       // 0..1
    shape?: "diamond" | "roundedSquare" | "circle" | "hexagon";
    reveal?: "fade" | "iris" | "slideDown" | "dissolve" | "flash";
    revealDurationMs?: number;             // 200..3000
    glow?: { enabled: boolean; color: string; neonPulse: boolean; rainbow: boolean; flow: boolean; colorByTimer: boolean; speedSec: number };
    timer?: { enabled: boolean; durationSec: number; showCountdown: boolean; countdownColor: string; countdownPos: "top"|"topLeft"|"left"|"bottomLeft"; urgentPulse?: boolean; urgentBelowSec?: number };
  };
  matchTimer?: {                           // 左下マッチタイマー（任意）
    enabled: boolean;
    x: number; y: number;                  // 0..100 の %
    color: string;
    fontScale: number;                     // 0.6..2.4
    label: string;
  };
};
\`\`\`

lines は厳密に6個。各 index の意味:
- 0: 1段目（アイコン横の小さいテキスト、デフォルト "Ladder"）
- 1: 2段目（大きいタイトル）
- 2: 3段目（Scrims 等）
- 3: 4段目（VS 等）
- 4: 5段目（RULESET 等）
- 5: SET一覧（sets 配列を持つ）

# 制約
- 6行の構造は必ず維持。配列を増減しない。
- iconImage は変更しない（指示がない限り）。
- color は #RRGGBB 形式の16進。"赤" は "#FF4444" などに変換。
- 不明な指示は無視し、設定をそのまま返す。

# 出力形式
\`\`\`json
{ "iconImage": "...", "lines": [ ... ] }
\`\`\`
余計な説明を一切付けず、純粋な JSON のみ返してください。`;

export async function applyInstruction(
  current: OverlaySettings,
  userText: string,
  apiKey: string,
): Promise<OverlaySettings> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `現状の OverlaySettings:
\`\`\`json
${JSON.stringify(current, null, 2)}
\`\`\`

指示: ${userText}

更新後の OverlaySettings JSON のみを返してください。`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude から応答が得られませんでした");
  }

  const raw = textBlock.text.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude からの応答に JSON が含まれていません");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Claude からの JSON が不正です");
  }

  const next = parsed as Partial<OverlaySettings>;
  if (!next || typeof next !== "object" || !Array.isArray(next.lines) || next.lines.length !== 6) {
    throw new Error("更新後の設定が不正です（6行構造が崩れました）");
  }
  return {
    iconImage: typeof next.iconImage === "string" ? next.iconImage : current.iconImage,
    lines: next.lines,
    align:
      next.align === "left" || next.align === "center" || next.align === "right"
        ? next.align
        : current.align,
    perkCover: next.perkCover ?? current.perkCover,
    matchTimer: next.matchTimer ?? current.matchTimer,
  };
}
