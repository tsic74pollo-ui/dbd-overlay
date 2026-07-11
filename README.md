# DBD Game Overlay Tool

Dead by Daylight のスクリム / 大会用 OBS オーバーレイエディタ。

> **Disclaimer**: 本ツールは非公式のファンメイドツールであり、Behaviour Interactive とは一切関係ありません。ゲーム内アセットは使用していません。
> This is an unofficial fan-made tool, not affiliated with or endorsed by Behaviour Interactive. Dead by Daylight™ is a trademark of Behaviour Interactive Inc. No in-game assets are used.

- **Ably Realtime ライブ反映** — エディタで編集 → OBS Browser Source に即時反映（HTML エクスポート不要）
- **複数ルーム** — OBS のシーンごとに別オーバーレイを同時運用、エディタを開いている間は全ルーム同時配信
- **パーク隠し ＋ マッチタイマー** — ゴースティング対策（下記参照）

## 動作の流れ

```
[エディタ /] ─publish─▶ Ably Realtime ─push─▶ [/overlay?room=<id>]  (OBS Browser Source)
```

Ably の API キーはサーバー側（`api/ably-token.ts` / ローカルでは Vite の開発ミドルウェア）だけが保持し、ブラウザには**短命・スコープ限定のトークン**しか渡らない（[api/_ablyShared.ts](api/_ablyShared.ts) 参照）。この鍵はこのアプリの `dbd:*` チャネル以外には一切アクセスできない。

## セットアップ (約 5 分)

### 1. 依存をインストール

```sh
npm install
```

### 2. Ably のキーを用意（無料）

1. <https://ably.com/dashboard> でサインアップ → アプリ作成 → API キーを控える
   - 可能なら capability を **publish / subscribe / presence** のみに制限したキーを作る
2. プロジェクト直下に `.env.local` を作成:

   ```env
   ABLY_API_KEY=your-ably-key-here
   ```

   > ⚠️ `VITE_` を付けない。付けるとブラウザバンドルに焼き込まれ、視聴者全員に鍵が露出する。このキーはサーバー（Vercel の serverless function / ローカルの Vite 開発ミドルウェア）だけが読む。

### 3. 起動

```sh
npm run dev
```

`http://localhost:5173/` を開くとエディタが立ち上がる（`/api/ably-token` はローカルでも Vite のミドルウェアが同じロジックで応答するので、追加のセットアップは不要）。

初回起動時は**セットアップガイド**が自動で開く: 視点(Killer/Survivor)と HUD スケールを選ぶ → ロゴを入れる（任意）→ OBS 用 URL をコピー、の3ステップで配信に乗るところまで完了する。もう一度見たいときはルームバー右上の「使い方」から。

## OBS への接続

1. OBS の任意のシーンで **「ソース追加」→「ブラウザ」**
2. URL に `http://localhost:5173/overlay?room=<roomId>` を貼る
   - エディタ画面上部の **「Browser Source URL」** ボタンでクリップボードにコピーできる
3. 幅 1920 / 高さ 1080 を推奨
4. 「OBS が表示されていないときにソースをシャットダウン」は **OFF** にしておくと、シーンに復帰したときに即時表示される

## パーク隠し ＋ マッチタイマー（ゴースティング対策）

配信を覗いてパーク構成を見られる「ゴースティング」対策として、**右下のパーク欄を視聴者にだけ隠す**機能。OBS のブラウザソースに重ねるだけなので、自分のゲーム画面ではパークは見えたまま、視聴者にだけ隠れる。追加の OBS 設定は不要（既存のオーバーレイに乗る）。

設定パネルの **「試合コントロール」「パーク隠しカバー」「マッチタイマー」** で操作する。

- **パーク隠しカバー（右下）**: 画像・ロゴをアップロードして右下パーク欄に重ねる。背景色＋不透明度（100% で完全に隠れる）。**プリセット**（1080p / HUD 80%・100%）でワンタッチ配置、スライダーで微調整。
- **光る枠**: ネオン点滅 / 流れる虹色ボーダー / 残時間で色変化（緑→赤）を各オンオフ・組み合わせ可。
- **開放タイマー**: 制限時間を分＋秒で自由設定。0 になるとカバーがフェードアウトして自動開放（試合序盤だけ隠す運用に）。残り時間を画面表示するかも切替可。
- **マッチタイマー（左下）**: 経過時間のカウントアップ表示。位置・色・サイズを調整可。
- **「試合開始」**: マッチタイマー（カウントアップ）とパーク開放タイマー（カウントダウン）を 1 ボタンで同時スタート。停止 / リセットも同様。

> 状態は他の設定と同じく Ably Realtime で OBS 側に即時反映される。OBS と同じ PC で操作する想定（時刻基準でカウント）。

## 複数ルームの使い方（シーンごとに別オーバーレイを常時表示）

- 「+追加」で新しいルームを作成（独立したオーバーレイ）。例: ＜メイン＞=ゲーム画面/左揃え、＜ルーム2＞=待機画面/中央揃え。
- OBS の **各シーンに、それぞれのルームの Browser Source URL** を1つずつ割り当てる。
  - URL はエディタ上部の **「Browser Source URL」** ボタンで取得（**いま選択中のルーム**の URL がコピーされる）。ルームを切り替えて各シーン分コピー → 各シーンに貼る。
- **エディタ（`/`）を開いている間、全ルームを同時にライブ配信し続けます。** そのため:
  - OBS の **シーンを切り替えるだけ**で各シーンのオーバーレイが常に最新表示される（**エディタ側でルームを切り替える必要はありません**）。
  - 編集はエディタで選択中（アクティブ）のルームに対して行い、その変更は該当ルームのオーバーレイにだけ即時反映される。他ルームは最後の状態を保ったまま表示し続ける。
- ⚠️ この仕組みは broadcast 方式のため、**配信中はエディタのタブを開いたままにしてください**（閉じると新規ソースに状態が届かなくなります）。「OBS が表示されていないときにソースをシャットダウン」も **OFF** 推奨。

## Vercel デプロイ

1. このリポジトリを GitHub にプッシュ
2. <https://vercel.com> で Import → デフォルト設定で OK（`api/*.ts` は自動で serverless function として検出される、`vercel.json` 不要）
3. Project Settings → Environment Variables に `ABLY_API_KEY`（Production + Preview、値はサーバー専用の Ably キー）を追加
4. デプロイ後、OBS Browser Source の URL を `https://<your-app>.vercel.app/overlay?room=<id>` に変更

## ファイル構成

```
api/
├── ably-token.ts      # Vercel serverless function: dbd:* スコープのトークンを発行
└── _ablyShared.ts     # トークン発行ロジック（api-token と Vite 開発ミドルウェアで共有）
src/
├── routes/
│   ├── EditorPage.tsx   # / 編集画面
│   ├── OverlayPage.tsx  # /overlay?room=xxx 表示画面
│   └── RemotePage.tsx   # /remote?r=xxx スマホ用リモコン
├── components/
│   ├── OverlayView.tsx  # 透過オーバーレイ（共通）
│   ├── SettingsPanel.tsx # コア設定＋折りたたみ式「詳細設定」
│   ├── PerkCoverEditor.tsx, MatchTimerEditor.tsx, LineEditor.tsx, SetsEditor.tsx, IconPicker.tsx
│   ├── RoomBar.tsx      # 複数ルーム UI
│   └── ui/              # Button, Input, Switch, Label, Field
├── store/
│   ├── appStore.ts      # Zustand: rooms / activeRoomId（persist）
│   └── connectionStore.ts
└── lib/
    ├── types.ts, defaults.ts, cn.ts
    ├── ably.ts          # 共有 Ably クライアント（authCallback でトークン取得）
    ├── realtimeSync.ts  # 設定同期（dbd:state:<roomId>）
    ├── realtimeCommand.ts # リモコン用コマンド（dbd:cmd:<roomId>）
    └── migrateLegacy.ts # 旧 localStorage 取り込み
```
