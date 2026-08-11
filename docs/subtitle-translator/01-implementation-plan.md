# DBD Subtitle Translator — 調査結果と実装計画

対象仕様書: [`00-requirements-v0.2.md`](./00-requirements-v0.2.md)
ステータス: **承認待ち（コード実装は未着手。設計成果物のみ先行）**
作成日: 2026-08-10 / 更新: 2026-08-10（対象 OS を Windows に確定）

関連ドキュメント:
- [`02-asr-benchmark-plan.md`](./02-asr-benchmark-plan.md) — Phase 0 の ASR 評価計画
- [`03-glossary-design.md`](./03-glossary-design.md) — DBD 用語辞書の設計と運用
- [`04-translation-prompt-design.md`](./04-translation-prompt-design.md) — 翻訳プロンプトと構造化出力
- [`glossary/dbd-core.yaml`](./glossary/dbd-core.yaml) — 辞書の初期データ

---

## 0. エグゼクティブサマリ

| 項目 | 推奨 | 主な理由 |
| --- | --- | --- |
| デスクトップ基盤 | **Tauri v2 + React 19 + TypeScript + Vite + Tailwind v4** | リファレンス実装と同一構成。かつ **既存 dbd-overlay と完全に同じスタック**（React 19 / TS / Vite / Tailwind v4 / Zustand / Radix）で学習コストゼロ |
| ASR 実行系 | **Python 3.12 サイドカー（FastAPI + PyInstaller）** | ASR エコシステムが Python 一択。Tauri が子プロセスとして起動 |
| ASR モデル | **Phase 0 のベンチマークで決定**。第一候補 `faster-whisper large-v3-turbo`、対抗 `Qwen3-ASR-1.7B` | 韓国語が必須要件のため NVIDIA Canary / Parakeet は**候補外**（欧州 25 言語のみで韓国語非対応） |
| 翻訳 LLM | **Provider 抽象化。既定 Claude Sonnet 5、難所は Claude Opus 5** | 構造化 JSON 出力・1M コンテキスト・プロンプトキャッシュ・Batch 50% 割引が揃う |
| 日本語改行 | **BudouX（Apache-2.0）** | 日本語の文節境界改行のために作られたライブラリ。リファレンスの英語向け処理をそのまま使えない部分の答え |
| 字幕品質層 | **TypeScript で実装（Python に置かない）** | GPU なし CI でテスト可能。翻訳と字幕生成を分離する原則3 を構造で担保 |
| プロジェクト形式 | `.dbdsub`（JSON）＋ 同名サイドカーディレクトリ | 差分が読める・壊れにくい・原則「中断耐性」に必要な逐次保存が容易 |
| 30分動画あたりの翻訳コスト | **約 $0.2〜$1.1（¥30〜¥170）** | 後述 §7 で内訳 |

**Phase 0（ASR ベンチマーク）を完了するまで ASR を確定させない。** これは仕様書の原則2 に対する直接の回答であり、
本計画の Phase 1 以降は「ASR が差し替え可能である」ことを前提に組んである。

---

## 1. リファレンス解析: lecture_subtitle_translator

### 1.1 判明した構成

| 項目 | 内容 |
| --- | --- |
| ライセンス | **Apache-2.0**（FFmpeg・Hunspell 辞書は各々のライセンス、`THIRD_PARTY_NOTICES.md` に記載） |
| フロント / デスクトップ | React 19 + TypeScript + **Tauri v2** + Tailwind CSS v4 + Vite |
| バックエンド | Python 3.13 + FastAPI（パイプライン実行 API）、**WhisperX**（GPU）、OpenAI / Google GenAI API、boto3（AWS 実行系） |
| メディア / テキスト | FFmpeg（LGPL ビルド同梱）、Hunspell / nspell（英語スペルチェック）、SCOWL/Ispell 辞書 |
| ディレクトリ | `frontend/`（字幕エディタ + Tauri）、`backend/`（WhisperX 連携）、`poc/`（検証コード） |
| 配布 | Windows 10/11 x64、macOS（Apple Silicon）、Linux x64 AppImage、Fedora RPM |
| 用途 | **日本語講義動画 → 英語字幕**（本プロジェクトとは言語方向が逆） |

### 1.2 パイプライン（元プロジェクト）

```
動画 →[FFmpeg]→ 音声 →[WhisperX: 日本語 ASR + 強制アラインメント]→ セグメント
   →[TypeScript 後処理]→ 日本語ブロック分割・結合
   → LLM 英訳
   → 字幕品質検証（CPS / 行長 / 表示時間）
   → 自動圧縮・分割・文脈統合
   → レビューフラグ生成 + 処理ログ
   →[エディタで人間が確認・承認]→ SRT / JSON プロジェクト
```

思想として明記されている責務分担が本プロジェクトにそのまま効く:
> 「機械が字幕フォーマット準拠（CPS・行長・表示時間）を検証し、人間が意味の正確さを確認する」

### 1.3 採用 / 変更 / 不採用の判断

| 分類 | 項目 | 判断理由 |
| --- | --- | --- |
| **採用（設計思想）** | ASR → テキスト処理 → 翻訳 → 品質調整 → 出力 のパイプライン | 仕様書 §2.3 が明示的に要求 |
| **採用（設計思想）** | 品質検証 →「違反したら自動修正（圧縮・分割）」のループ構造 | 翻訳と字幕レイアウトの分離（原則3）を成立させる中核 |
| **採用（設計思想）** | ブロック単位の処理履歴 + レビューフラグ（「要確認 🚩」相当） | 仕様書 §21 の confidence／レビュー要件に直結 |
| **採用（設計思想）** | プロジェクト JSON による中断・再開 | 仕様書 §25・§31（中断耐性） |
| **採用（設計思想）** | 用語辞書（CSV/XLSX）読み込み | 仕様書 §16 |
| **採用（技術選定）** | Tauri v2 + React + TS + Tailwind v4 の構成 | 既存 dbd-overlay と同一スタックで二重に有利 |
| **採用（技術選定）** | Python サイドカーで ASR を隔離する構造 | ASR エコシステムは Python 一択 |
| **変更** | 言語方向: 日本語→英語 ⇒ **多言語→日本語** | 字幕メトリクスがまるごと変わる（後述 §5） |
| **変更** | ASR を WhisperX 固定 ⇒ **ASRProvider 抽象 + ベンチマークで選定** | 原則2 |
| **変更** | 英語スペルチェック（Hunspell / SCOWL） ⇒ **日本語の禁則処理・文節改行（BudouX）** | 出力言語が日本語なので Hunspell は用途がない |
| **変更** | 単一話者前提のデータモデル ⇒ **speaker_id を最初から持つモデル** | 原則5（将来の話者分離） |
| **不採用** | AWS / boto3 によるクラウド ASR 実行系 | MVP はローカル GPU 前提。API 版は Provider の 1 実装として後付け可能 |
| **不採用** | PDF からの用語候補抽出 | 講義資料向け機能。DBD には Wiki スクレイプの方が適切（Phase 2） |
| **不採用** | UI 多言語対応（日本語 / 英語 / 中国語） | MVP は日本語 UI のみ（原則7） |
| **コード流用** | 現時点で**直接流用は計画しない**。設計思想のみ参照 | 流用する場合は Apache-2.0 の NOTICE 保持と出典明記を必須とし、`THIRD_PARTY_NOTICES.md` に記載する |

> **ライセンス方針**: 設計思想の参照は制約を生まない。もし後で CPS 判定などのコードを直接流用する場合は、
> 該当ファイル冒頭に出典と Apache-2.0 表記を残し、リポジトリに `NOTICE` を追加する。
> この線引きを PR レビューのチェック項目にする。

---

## 2. ASR 調査結果

### 2.1 候補比較

| モデル | 対応言語 | 韓国語 | 多言語 WER | 語単位タイムスタンプ | ローカル | ライセンス | 判定 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Whisper large-v3**（faster-whisper / CTranslate2） | 99 | ✅ | 9.9%（24言語平均） | WhisperX の強制アラインメントで取得 | ✅ | MIT | **第一候補** |
| **Whisper large-v3-turbo** | 99 | ✅ | ≒large-v3、大幅に高速 | 同上 | ✅ | MIT | **第一候補（既定）** |
| **Qwen3-ASR-1.7B** | 52（韓/日/中/欧州） | ✅ | **5.76%** | ネイティブ + Qwen3-ForcedAligner | ✅ | Apache-2.0（要確認） | **対抗候補** |
| NVIDIA Canary-1B-v2 | 欧州 25 のみ | ❌ | 8.1%（24言語平均） | ✅ | ✅ | — | **候補外**（韓国語非対応） |
| NVIDIA Parakeet-TDT-0.6B-v3 | 欧州 25 のみ | ❌ | 9.7% | ✅ | ✅ | — | **候補外**（同上） |
| Deepgram Nova-3 (API) | 多言語 | ✅ | — | ✅ | ❌ | 商用 | 予備（$0.26/h） |
| AssemblyAI Universal (API) | 多言語 | ✅ | — | ✅ | ❌ | 商用 | 予備（$0.15〜0.21/h） |

**重要な発見**: ベンチマーク上位の Canary-1B-v2 / Parakeet-TDT-v3 は **欧州 25 言語専用で韓国語を含まない**。
仕様書 §6.1 が韓国語を優先対象に挙げている以上、平均 WER の良さだけで選ぶと要件を満たせない。
「多言語 ASR ランキング上位＝本プロジェクトに最適」ではない、というのが今回の調査で最も実務的な結論。

### 2.2 DBD 音声特有のリスク（一般ベンチマークでは測れない部分）

| リスク | 内容 | 対策 |
| --- | --- | --- |
| **ハルシネーション** | Whisper 系はゲーム BGM・心音・チェイス音楽など「音声でない音」に対して幻聴テキストを生成する | Silero VAD（faster-whisper 内蔵 `vad_filter`）＋ `no_speech_prob` 閾値＋反復 n-gram 検出でフィルタ |
| **タイムスタンプのドリフト** | 長尺動画でセグメント時刻が徐々にずれる | チャンク分割 + 強制アラインメント（WhisperX 相当）で補正 |
| **言語自動判定の揺れ** | 途中でコードスイッチすると判定が動画内で変わる | チャンクごとに判定 → 多数決で動画全体の言語を決定。UI から手動上書き可能 |
| **VC の音割れ・低ビットレート** | Discord 経由の VC は帯域が狭い | 前処理（ハイパス、ラウドネス正規化 EBU R128）を独立モジュールに |
| **同時発話** | MVP スコープ外だが認識が崩れる | 低 confidence としてレビューフラグを立てるのみ |

### 2.3 VRAM / 速度の見積り（RTX 4060 SUPER 16GB 想定）

| モデル | 精度 | 概算 VRAM | 30分動画の処理時間目安 |
| --- | --- | --- | --- |
| large-v3-turbo (fp16) | 高 | 約 6 GB | 数分 |
| large-v3 (fp16) | 最高 | 約 5 GB | turbo の数倍 |
| large-v3 (int8) | 中〜高 | 約 2 GB | GPU なし PC でも動作可 |
| + 強制アラインメント (wav2vec2) | — | +1〜2 GB | 追加で数十秒〜 |

> 実測値は Phase 0 のベンチマークで埋める。上表は候補選定のための当たりであり、確定値ではない。

---

## 3. 翻訳 LLM 調査結果

### 3.1 候補比較

| モデル | 入力 $/1M | 出力 $/1M | コンテキスト | 構造化 JSON | 備考 |
| --- | --- | --- | --- | --- | --- |
| **Claude Sonnet 5** | $3.00（〜2026-08-31 は $2.00） | $15.00（同 $10.00） | 1M | ✅ `output_config.format` | **既定推奨**。バルク翻訳向け |
| **Claude Opus 5** | $5.00 | $25.00 | 1M | ✅ | 難所セグメントの再翻訳・スラング解釈用 |
| Claude Haiku 4.5 | $1.00 | $5.00 | 200K | ✅ | 最安。品質検証後に選択肢へ |
| Gemini 3.6 Flash | $1.50 | $7.50 | 大 | ✅ | 代替 Provider |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 | 大 | ✅ | 超低コスト枠 |
| GPT-5.6 Luna | $1.00 | $6.00 | 大 | ✅ | 代替 Provider |

### 3.2 Claude を既定に推す理由

1. **構造化出力**（`output_config.format` + JSON Schema）で `{id, translated_text, confidence, notes}` を
   スキーマ保証で受け取れる。翻訳 AI に字幕レイアウトを触らせない（原則3）ための土台になる。
2. **プロンプトキャッシュ**: DBD 用語辞書 + システムプロンプトという「毎回同じ大きな前置き」が
   キャッシュ読み取り（約 0.1 倍）になる。Claude Opus 5 はキャッシュ最小長が 512 トークンと短く、
   辞書が小さいうちから効く。
3. **Batch API 50% 割引**: 動画一括翻訳は非対話処理なので、そのまま半額で流せる。
4. **1M コンテキスト**: 将来「動画全体の会話履歴を文脈として渡す」拡張に余裕がある。

**ただし Provider 抽象は必須**（仕様書 §14）。既定を Claude にするだけで、Gemini / GPT 実装は同じ
インターフェースで差し込む。

---

## 4. システムアーキテクチャ

### 4.1 全体構成

```
┌──────────────────────────── Tauri v2 デスクトップアプリ ────────────────────────────┐
│                                                                                    │
│  React 19 + TS UI                          Rust コア                                │
│  ├── プロジェクト画面                       ├── サイドカー起動 / 監視                  │
│  ├── 処理進捗画面                           ├── ファイル I/O・プロジェクト保存          │
│  └── 字幕レビュー画面                       └── OS キーチェーン（API キー）             │
│                                                                                    │
│  packages/subtitle-core（純 TypeScript・GPU 不要）                                   │
│  ├── セグメント結合 / 分割                                                            │
│  ├── 品質検証（CPS / 行長 / 行数 / 表示時間 / 間隔）                                    │
│  ├── 日本語改行（BudouX）+ 禁則処理                                                    │
│  ├── 用語辞書マッチング                                                               │
│  └── SRT / VTT / ASS 書き出し                                                        │
│                                                                                    │
│  packages/translation（TranslationProvider 抽象）                                    │
│  └── Claude / Gemini / OpenAI / Mock                                                │
└───────────────────────────────┬────────────────────────────────────────────────────┘
                                │ ローカル HTTP（127.0.0.1、ランダムポート＋トークン）
┌───────────────────────────────▼────────────────────────────────────────────────────┐
│  sidecar/（Python 3.12 + FastAPI、PyInstaller で単一実行ファイル化）                    │
│  ├── media: FFmpeg 解析・音声抽出（16kHz mono WAV）                                    │
│  ├── preprocess: VAD / ラウドネス正規化 / ハイパス     ← 将来 音源分離を差し込む場所      │
│  ├── asr/: ASRProvider 抽象                                                          │
│  │   ├── faster_whisper_provider.py                                                 │
│  │   ├── qwen3_asr_provider.py                                                      │
│  │   └── api_provider.py（Deepgram 等）                                              │
│  └── diarize/: 将来の Speaker Diarization（Phase 3、MVP では未実装のフォルダのみ）      │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 なぜ字幕品質層を TypeScript 側に置くのか

- GPU も Python も不要で、**CI（GitHub Actions）でユニットテストが回る**。
- 「翻訳 → 字幕整形」を別プロセス・別パッケージに物理的に分離することで、原則3 が構造で守られる。
- 再翻訳や手編集のたびに Python を呼ばずに、UI 上で即座に再整形して警告表示できる。

### 4.3 なぜ Python サイドカーが必要か

faster-whisper / CTranslate2 / Qwen3-ASR / pyannote / Demucs はすべて Python 実装。
Rust / JS へ移植する合理性はなく、リファレンス実装も同じ構成を採っている。

**サイドカー通信の安全策**: `127.0.0.1` のみに bind、起動時に生成したランダムポート＋
ワンタイムトークンを必須ヘッダとする。外部からアクセスできる待受を作らない。

---

## 5. データモデル

### 5.1 SubtitleSegment（仕様書 §18 を満たし、Phase 3-4 まで拡張可能にした形）

```ts
type SubtitleSegment = {
  id: string;                    // ULID
  startTime: number;             // 秒（float）
  endTime: number;
  originalText: string;          // ★ 必ず保持（原則4）
  translatedText: string | null;
  sourceLanguage: string;        // BCP-47: "ko", "en", "de" …
  targetLanguage: string;        // "ja"
  speakerId: string | null;      // ★ Phase 3 の話者分離を先取り（原則5）
  confidence: number | null;     // ASR 由来
  metadata: {
    asrProvider?: string;        // "faster-whisper@large-v3-turbo"
    translationProvider?: string;// "claude@claude-sonnet-5"
    glossaryMatches?: GlossaryMatch[];
    reviewStatus?: "pending" | "flagged" | "approved";
    flags?: QualityFlag[];       // CPS 超過など、字幕品質層が付与
    words?: WordTiming[];        // 語単位タイムスタンプ（分割時に使う）
    gameContext?: unknown;       // Phase 4 予約
    visualContext?: unknown;     // Phase 4 予約
    history?: EditRecord[];      // ブロック単位の処理履歴
  };
};

type Speaker = {
  speakerId: string;
  label: string;                 // ユーザーが付ける「Player 1」等
  color: string;                 // UI 表示用
  confidence: number | null;
};
```

`speakerId` と `Speaker[]` を **MVP から入れる**。MVP では全セグメントが `null` か単一話者だが、
Phase 3 でダイアライゼーションを足すときにスキーマ変更もマイグレーションも不要になる。

### 5.2 プロジェクトファイル

```
MyVideo.dbdsub                  ← JSON（スキーマバージョン付き）
MyVideo.dbdsub.files/
├── audio.wav                   ← 抽出済み音声（再抽出を避ける）
├── asr-raw.json                ← ASR 生出力（再翻訳時に ASR をやり直さない）
└── checkpoints/                ← 工程ごとのチェックポイント
```

- **中断耐性**: 各工程の完了時に `.dbdsub` を**アトミック書き込み**（tmp → rename）で更新。
  アプリが落ちても直前の工程から再開できる。
- **JSON を選ぶ理由**: 差分が読める / 壊れても手で直せる / Git 管理できる。
  セグメント数は長尺でも数千程度で、SQLite が必要な規模ではない。
- **API キーは絶対に入れない**（仕様書 §26）。Tauri のキーチェーン連携経由で OS の資格情報ストアに保存。

---

## 6. 字幕品質最適化（日本語向けの再設計）

リファレンスは英語出力なので、**ここは流用できず作り直しになる**。日本語字幕の要件は別物。

### 6.1 既定パラメータ（すべて設定で変更可能）

| 項目 | 既定値 | 根拠 |
| --- | --- | --- |
| 最大 CPS | 8 文字/秒（警告 10 超） | 日本語字幕は表意文字のため英語の CPS 基準（17-20）をそのまま使えない |
| 1 行あたり最大文字数 | 全角 18 文字 | YouTube / 実況動画で一般的なレンジ |
| 最大行数 | 2 行 | |
| 最小表示時間 | 1.0 秒 | |
| 最大表示時間 | 7.0 秒 | |
| 最小字幕間隔 | 0.084 秒（24fps で 2 フレーム） | 連続字幕のちらつき防止 |

### 6.2 処理フロー

```
翻訳済みテキスト
  ↓ ① 正規化（全角/半角、連続記号、前後空白）
  ↓ ② 文節分割 ── BudouX（Apache-2.0、日本語の改行位置決定のためのライブラリ）
  ↓ ③ 改行位置決定 ＋ 禁則処理（行頭に 。、」）を置かない／行末に「（ を置かない）
  ↓ ④ 品質検証（CPS / 行長 / 行数 / 表示時間 / 間隔）
  ↓ ⑤ 違反時の自動修正
  │    ├─ CPS 超過 → 表示時間を後方へ延長（次字幕と衝突しない範囲）
  │    ├─ なお超過 → セグメント分割（語単位タイムスタンプを利用）
  │    ├─ 表示時間過短 → 前後セグメントと結合
  │    └─ どうしても解決しない → LLM へ「意味を保って N 文字以内に圧縮」を依頼（別プロンプト）
  ↓ ⑥ 残った違反に reviewStatus="flagged" を付与
整形済み字幕
```

**BudouX を推す理由**: 日本語の「どこで改行すると読みやすいか」を機械学習で判定するために Google が
作ったライブラリ。モデルが数十 KB と小さく JS でそのまま動くため、TypeScript の字幕品質層に同梱できる。
形態素解析器（kuromoji.js 等）は辞書が数 MB あり、必要以上に重い。

⑤ の LLM 圧縮だけは翻訳 AI を呼ぶが、**呼ぶかどうかを決めるのは字幕層**であり、
字幕レイアウト自体は LLM に決めさせない。原則3 は保たれる。

---

## 7. 翻訳コストの見積り

前提: 30 分動画、発話セグメント約 600、1 リクエスト 25 セグメント（= 24 リクエスト）、
システムプロンプト + DBD 用語辞書 約 3,000 トークン（2 回目以降キャッシュ読み取り）、
文脈ウィンドウ（前後 3 セグメント）約 1,500 トークン、出力 JSON 約 1,500 トークン/リクエスト。

| モデル | 通常実行 | Batch API（50% 割引） |
| --- | --- | --- |
| **Claude Sonnet 5**（導入価格 $2/$10） | **約 $0.45**（≒ ¥70） | **約 $0.22**（≒ ¥35） |
| Claude Sonnet 5（通常価格 $3/$15） | 約 $0.67 | 約 $0.34 |
| **Claude Opus 5**（$5/$25） | **約 $1.12**（≒ ¥170） | 約 $0.56 |
| Gemini 3.1 Flash-Lite（$0.25/$1.50） | 約 $0.08 | — |

**ASR はローカル実行なら追加コスト 0**（電気代のみ）。API ASR を使う場合は 30 分あたり
$0.08〜0.23（Deepgram / AssemblyAI）が上乗せされる。

→ **1 動画あたり ¥35〜¥170 程度**。動画制作の工数削減効果を考えれば実用範囲内。
UI に推定コストと実績コストを表示し、ユーザーが Provider を選べるようにする。

---

## 8. 実装フェーズ

### Phase 0 — ASR ベンチマーク（実装着手の前提、約 1 週間）
詳細は [`02-asr-benchmark-plan.md`](./02-asr-benchmark-plan.md)。

- 成果物: ベンチマークハーネス（`bench/`）、評価レポート、**MVP 採用 ASR の決定**
- ここを飛ばすと原則2 に反する。**Phase 1 の実装はこの結果を待たずに開始できる**
  （ASRProvider 抽象と Mock Provider で進められるため）

### Phase 1 — 骨格とパイプライン疎通（約 2 週間）
- [ ] Tauri v2 プロジェクト初期化（既存 dbd-overlay の tsconfig / eslint / Tailwind 設定を踏襲）
- [ ] Python サイドカーの起動・監視・終了（Rust 側）、ローカル HTTP + トークン認証
- [ ] FFmpeg 同梱（**LGPL ビルドのみ**）とメディア解析・音声抽出（16kHz mono WAV）
- [ ] `ASRProvider` インターフェース ＋ `MockProvider`（固定 JSON を返す）＋ 実 Provider 1 つ
- [ ] `SubtitleSegment` / `Project` データモデルとプロジェクト保存・読込
- [ ] 原文のみの SRT 出力
- **完了条件**: 動画を入れて原文 SRT が出る

### Phase 2 — 翻訳レイヤー（約 2 週間）
- [ ] `TranslationProvider` インターフェース ＋ Claude 実装 ＋ Mock 実装
- [ ] 構造化 JSON 出力（JSON Schema でスキーマ保証）
- [ ] 文脈ウィンドウ構築（前後 N セグメント + 話者 + 翻訳履歴）
- [ ] DBD 用語辞書（YAML/CSV 読み込み、多言語原語 ↔ 日本語正式名称）とプロンプト注入
- [ ] プロンプトキャッシュ / Batch API 対応、コスト表示
- [ ] OS キーチェーンへの API キー保存
- **完了条件**: 原文 + 日本語訳の対訳 SRT が出る

### Phase 3 — 字幕品質最適化（約 1.5 週間）
- [ ] BudouX 統合、禁則処理
- [ ] 品質検証ルールと自動修正（延長 / 分割 / 結合 / LLM 圧縮）
- [ ] `QualityFlag` とレビューフラグ付与
- [ ] ゴールデンフィクスチャによるユニットテスト一式
- **完了条件**: CPS・行長・表示時間の違反が自動解消され、残りにフラグが立つ

### Phase 4 — レビュー UI（約 2.5 週間）
- [ ] 動画プレビュー（Tauri の asset protocol + `<video>`）
- [ ] 字幕タイムライン（簡易。本格的な編集タイムラインは対象外）
- [ ] 対訳エディタ（原文表示 / 日本語編集 / 時間変更 / 削除 / 分割 / 結合 / 話者変更）
- [ ] セグメント単位の再翻訳・原文からの再翻訳
- [ ] 処理進捗画面（解析 → 抽出 → 認識 → 翻訳 → 最適化）
- **完了条件**: 仕様書 §22 の編集機能がすべて動く

### Phase 5 — 堅牢化と配布（約 1.5 週間）
- [ ] 仕様書 §29 の全エラーケースのハンドリングとユーザー向けメッセージ
- [ ] 工程ごとのチェックポイントと再開
- [ ] PyInstaller + Tauri バンドル、Windows インストーラ
- [ ] モデル未同梱・初回起動時ダウンロード方式（インストーラ肥大化の回避）
- [ ] README / セットアップガイド / `THIRD_PARTY_NOTICES.md`
- **完了条件**: MVP 成功条件 1〜10 をすべて満たす

**MVP 合計目安: 約 9〜10 週間**（Phase 0 含む）。

### 将来フェーズ（MVP 対象外・アーキテクチャのみ準備）
- Phase 6: DBD 用語辞書の拡充、スラング翻訳、話者ごとの口調
- Phase 7: 音源分離（Demucs 系）、Speaker Diarization（pyannote / NeMo）、VAD、重複発話
- Phase 8: ゲーム映像理解（キラー / パーク / マップ認識、OCR）

---

## 9. テスト計画

| 層 | 手法 | GPU |
| --- | --- | --- |
| 字幕品質層（TS） | Vitest。ゴールデンフィクスチャ（入力 JSON → 期待 SRT）。CPS・行長・分割・結合・禁則の境界値テスト | 不要 |
| 翻訳層（TS） | Mock Provider + 記録済みレスポンスのスナップショットテスト。JSON Schema 検証 | 不要 |
| ASR 層（Python） | pytest。10 秒程度の短い音声フィクスチャ。Provider インターフェース準拠テスト | 一部必要 |
| パイプライン E2E | 1 分クリップ → SRT。CI では Mock ASR Provider を使い GPU なしで実行 | 不要 |
| 翻訳品質評価 | 言語ごと 20 セグメントの人手評価セット。**用語正確性 / 自然さ / 文脈整合**の 3 軸で採点。Provider・プロンプト変更時の回帰検出に使う | 不要 |
| ASR 精度 | Phase 0 のベンチマークハーネスを回帰テストとして再利用 | 必要 |

**重要**: ASR / 翻訳という非決定的な部分を Mock で切り離すことで、**CI が GPU なしで完全に回る**。
これが「字幕品質層を TypeScript に置く」設計判断の実利。

---

## 10. 技術的リスクと対策

| # | リスク | 影響 | 対策 |
| --- | --- | --- | --- |
| 1 | **ゲーム BGM による ASR ハルシネーション** | 存在しない字幕が量産され信頼性が壊れる | VAD 必須化 + `no_speech_prob` 閾値 + 反復 n-gram 検出。Phase 0 で「ゲーム音強め」クリップを必ず評価対象に入れる |
| 2 | **韓国語 ASR 精度が実用水準に届かない** | 主要ユースケースが成立しない | Phase 0 で韓国語を独立の合格基準にする。不合格なら API Provider（Deepgram 等）を韓国語専用フォールバックにする |
| 3 | **インストーラ肥大化**（CUDA 込みで 600MB〜1.5GB） | 配布・導入のハードル | モデル非同梱 + 初回起動時ダウンロード。CPU 版（int8）と GPU 版のインストーラを分ける |
| 4 | **VRAM 不足 / GPU なし環境** | 起動すらできない | 起動時に GPU を検出し、モデルサイズを自動提案。int8 / CPU フォールバックを用意し、§29 のエラーとして明示 |
| 5 | **LLM のスラング誤訳** | 「翻訳できているが意味が違う」最悪パターン | 用語辞書 + few-shot + 低 confidence フラグ。§9 の人手評価セットで回帰検出 |
| 6 | **長尺動画でのタイムスタンプずれ** | 字幕が映像とずれる | チャンク処理 + 強制アラインメント。Phase 0 でタイムスタンプ精度も測る |
| 7 | **FFmpeg のライセンス事故** | 配布不能 | **LGPL ビルドのみ同梱**。GPL ビルド（`--enable-gpl`）を絶対に使わない。CI でバンドル内容を検査 |
| 8 | **pyannote のモデル利用条件**（Phase 3） | 将来の話者分離が詰む | Phase 3 着手時に HuggingFace の利用規約同意フローとトークン管理を設計。MVP では触らない |
| 9 | **Python サイドカーのクラッシュ** | 進行中の処理が消える | Rust 側でプロセス監視・自動再起動。工程チェックポイントから再開 |
| 10 | **翻訳コストの想定外の膨張** | ユーザーが使えなくなる | 実行前に推定コストを表示して確認。実績コストを記録。Batch API と安価 Provider を選択可能に |

---

## 11. 必要な外部サービス / API

| 用途 | サービス | 必須 | 備考 |
| --- | --- | --- | --- |
| 翻訳 | Anthropic API（既定） | ✅ | ユーザーが自分のキーを登録。OS キーチェーンに保存 |
| 翻訳（代替） | Google Gemini API / OpenAI API | ❌ | Provider 実装として選択可能 |
| ASR モデル配布 | Hugging Face | ✅ | 初回起動時のモデルダウンロード。認証不要のモデルのみ MVP で使用 |
| ASR（代替） | Deepgram / AssemblyAI | ❌ | ローカル ASR が不十分な言語のフォールバック |
| 話者分離（Phase 3） | Hugging Face（pyannote、規約同意が必要） | ❌ | MVP 対象外 |

**FFmpeg は同梱**（LGPL ビルド）。ネットワーク不要。

---

## 12. 未確定事項（実装開始前にご確認いただきたい点）

### 確定済み

| # | 論点 | 決定 |
| --- | --- | --- |
| A | **対象 OS** | **Windows**（2026-08-10 確定）。macOS / Linux は後追い |
| B | **ASR 実行環境** | Windows + NVIDIA GPU（CUDA）。`faster-whisper` / `Qwen3-ASR` 路線が有効。CPU（int8）フォールバックも用意 |

> **macOS を後追いする場合の注意**: `faster-whisper` の基盤である CTranslate2 は
> **Metal/MPS に非対応**で、Apple Silicon では CPU 実行しかできない
> （[CTranslate2 #1562](https://github.com/OpenNMT/CTranslate2/issues/1562)）。
> macOS 対応時は `mlx-whisper`（Metal）または
> [WhisperKit](https://github.com/argmaxinc/WhisperKit)（CoreML + ANE、MIT、
> pyannote 話者分離の SpeakerKit を同梱）を別 Provider として実装する。
> `ASRProvider` 抽象があるため、パイプライン本体の変更は不要。

### 未確定

| # | 論点 | 推奨 |
| --- | --- | --- |
| 1 | **配置**: この dbd-overlay リポジトリ内の別ディレクトリ（例 `apps/subtitle-translator/`）か、新規リポジトリか | まったく別のアプリなので**新規リポジトリ**を推奨。ただし同一リポジトリでも `apps/` 分割で成立する |
| 2 | **Phase 0 のサンプル動画**: 英語 / 韓国語 / EU 圏 / ゲーム音強め / VC 明瞭 / 複数人 VC の 6 本を用意いただけるか | 各 2〜3 分。正解書き起こしは冒頭 60 秒分だけで十分 |
| 3 | **GitHub の書き込み権限** | 現在 `403 Resource not accessible by integration` で push できない。Contents: Read and write の付与が必要 |

---

## 13. 出典

- lecture_subtitle_translator — <https://github.com/matsuolab/lecture_subtitle_translator>（Apache-2.0）
- [Canary-1B-v2 & Parakeet-TDT-0.6B-v3 論文（arXiv 2509.14128）](https://arxiv.org/abs/2509.14128)
- [nvidia/canary-1b-v2 — 対応言語（Hugging Face）](https://huggingface.co/nvidia/canary-1b-v2)
- [Qwen3-ASR（GitHub）](https://github.com/QwenLM/Qwen3-ASR) / [Qwen/Qwen3-ASR-1.7B](https://huggingface.co/Qwen/Qwen3-ASR-1.7B)
- [WhisperX（GitHub）](https://github.com/m-bain/whisperx) / [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [Best Open Speech Recognition Models in 2026 — MarkTechPost](https://www.marktechpost.com/2026/07/23/best-open-speech-recognition-asr-models-in-2026-wer-languages-latency-and-license-compared/)
- [Whisper variants の比較 — Modal](https://modal.com/blog/choosing-whisper-variants)
- [Speech-to-Text API 料金比較 — AssemblyAI](https://www.assemblyai.com/blog/speech-to-text-api-pricing)
- [Tauri v2 + Python sidecar の実例](https://github.com/dieharders/example-tauri-v2-python-server-sidecar)
- Anthropic モデル料金 — `claude-opus-5` $5/$25、`claude-sonnet-5` $3/$15（2026-08-31 まで導入価格 $2/$10）、`claude-haiku-4-5` $1/$5
- [Gemini API 料金 2026](https://benchlm.ai/google/api-pricing) / [OpenAI API 料金 2026](https://benchlm.ai/openai/api-pricing)
