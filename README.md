# DBD Game Overlay Tool

Dead by Daylight のスクリム / 大会用 OBS オーバーレイエディタ。
Figma Make で作った初版（[shut-valley-52523550.figma.site](https://shut-valley-52523550.figma.site/)）の見た目を 1:1 で踏襲し、Claude Code で次の 3 つを拡張した。

- **Supabase Realtime ライブ反映** — エディタで編集 → OBS Browser Source に即時反映（HTML エクスポート不要）
- **複数ルーム** — OBS のシーンごとに別オーバーレイを同時運用、ボタン1つで編集対象を切替
- **AI チャット編集** — Claude API に自然言語で指示するとオーバーレイ設定が更新される

## 動作の流れ

```
[エディタ /] ─publish─▶ Supabase Realtime ─push─▶ [/overlay?room=<id>]  (OBS Browser Source)
       │
       └─ チャット ─▶ Claude API ─▶ settings 更新
```

## セットアップ (約 5 分)

### 1. 依存をインストール

```sh
npm install
```

### 2. Supabase プロジェクトを用意（無料）

1. <https://supabase.com> でサインアップ → 新規プロジェクト作成
2. 左メニュー **Settings → API** から `Project URL` と `anon public key` を控える
3. プロジェクト直下に `.env.local` を作成:

   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

> 💡 Supabase の DB / Auth は使わず **Realtime channel.broadcast のみ** 使うので、テーブル作成は不要。無料枠で個人用なら永久無料。

### 3. Claude API キーを取得（AI チャット使う場合）

1. <https://console.anthropic.com/settings/keys> でキー作成
2. 起動後、画面右上の「Claude API: 未設定」をクリック → モーダルに貼り付け
3. キーは端末の `localStorage` に保存される（共有 PC では設定しない）

### 4. 起動

```sh
npm run dev
```

`http://localhost:5173/` を開くとエディタが立ち上がる。

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

> 状態は他の設定と同じく Supabase Realtime で OBS 側に即時反映される。OBS と同じ PC で操作する想定（時刻基準でカウント）。

## 複数ルームの使い方（シーンごとに別オーバーレイを常時表示）

- 「+追加」で新しいルームを作成（独立したオーバーレイ）。例: ＜メイン＞=ゲーム画面/左揃え、＜ルーム2＞=待機画面/中央揃え。
- OBS の **各シーンに、それぞれのルームの Browser Source URL** を1つずつ割り当てる。
  - URL はエディタ上部の **「Browser Source URL」** ボタンで取得（**いま選択中のルーム**の URL がコピーされる）。ルームを切り替えて各シーン分コピー → 各シーンに貼る。
- **エディタ（`/`）を開いている間、全ルームを同時にライブ配信し続けます。** そのため:
  - OBS の **シーンを切り替えるだけ**で各シーンのオーバーレイが常に最新表示される（**エディタ側でルームを切り替える必要はありません**）。
  - 編集はエディタで選択中（アクティブ）のルームに対して行い、その変更は該当ルームのオーバーレイにだけ即時反映される。他ルームは最後の状態を保ったまま表示し続ける。
- ⚠️ この仕組みは broadcast 方式のため、**配信中はエディタのタブを開いたままにしてください**（閉じると新規ソースに状態が届かなくなります）。「OBS が表示されていないときにソースをシャットダウン」も **OFF** 推奨。

## AI チャット例

- `Title を「練習会」に変更、赤に`
- `SET3 を追加して Killer は Blight、Player は A さん`
- `RULESET の背景透過を 50% に`
- `Scrims を緑、VS を青に変更`

無効な指示や API エラーは赤文字でチャット欄に表示され、設定は変更されない。

## Vercel デプロイ

1. このリポジトリを GitHub にプッシュ
2. <https://vercel.com> で Import → デフォルト設定で OK
3. Project Settings → Environment Variables に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を追加
4. デプロイ後、OBS Browser Source の URL を `https://<your-app>.vercel.app/overlay?room=<id>` に変更

## 既存版（Figma Make）の設定を引き継ぐ

旧版を同じブラウザで一度でも使っていれば、起動時に `localStorage` を自動でマイグレーションして 1 ルームとして取り込む。
別オリジンの場合（Figma Make のホスト vs Vercel）は移行できないので、見た目を見ながら手動で再設定するか、AI チャットに「以下を反映: ...」と貼り付けるのが楽。

## ファイル構成

```
src/
├── routes/
│   ├── EditorPage.tsx   # / 編集画面
│   └── OverlayPage.tsx  # /overlay?room=xxx 表示画面
├── components/
│   ├── OverlayView.tsx  # 透過オーバーレイ（共通）
│   ├── SettingsPanel.tsx, LineEditor.tsx, SetsEditor.tsx, IconPicker.tsx
│   ├── RoomBar.tsx      # 複数ルーム UI
│   ├── ChatPanel.tsx, ApiKeySetup.tsx
│   └── ui/              # Button, Input, Switch, Label
├── store/
│   ├── appStore.ts      # Zustand: rooms / activeRoomId / apiKey (persist)
│   └── connectionStore.ts
└── lib/
    ├── types.ts, defaults.ts, cn.ts
    ├── supabase.ts, realtimeSync.ts
    ├── claudeChat.ts    # Claude API 呼び出し
    └── migrateLegacy.ts # 旧 localStorage 取り込み
```
