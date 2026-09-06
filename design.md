# dbd-overlay Design Reference

## 1. Product principle

配信者が「何を設定すればよいか」で迷わず、5分以内にOBSへ表示できることを最優先する。
エディタは高機能でもよいが、初見では必要な操作だけを見せる。オーバーレイ出力は常にゲーム画面を主役にする。

優先順位:

1. Fast recognition — 0.5秒で現在状態と次の操作が分かる
2. Content over chrome — プレビューと入力内容をUI装飾より目立たせる
3. Progressive disclosure — OBS・バックアップ・高度設定は必要時だけ開く
4. Safe operation — 削除・上書き・接続異常を色と文言で区別する
5. Calm before wow — エディタは静かに、選んだレイアウト側で個性を出す

## 2. Visual language

- Dark mode first
- 80% neutral / 15% secondary / 5% accent
- 装飾グローはエディタでは使わない
- 奥行きは背景色の差と1px境界線で作り、強い影を多用しない
- 角丸は操作UIに限定。配信レイアウトの表現とは混ぜない

## 3. Color tokens

| Role | Color | Usage |
|---|---|---|
| Canvas | `#090B10` | アプリ最背面 |
| Surface | `#111722` | パネル・ヘッダー |
| Raised | `#182231` | カード・選択候補 |
| Border | `#2B3748` | 通常境界 |
| Border strong | `#46566C` | Hover・フォーカス |
| Text | `#F4F7FB` | 主テキスト |
| Muted | `#94A3B8` | 補足・ラベル |
| Action | `#F97316` | 適用・開始・主要操作 |
| Preview | `#38BDF8` | レイアウト・プレビュー文脈 |
| Live | `#34D399` | 接続済み状態だけ |
| Danger | `#F87171` | 削除・破壊操作だけ |

同じ画面でAction / Preview / Live / Dangerを装飾目的で混ぜない。色には必ず意味を持たせる。

## 4. Typography

- Font: system UI + `Noto Sans JP`
- Page title: 20–24px / 700
- Section title: 14–16px / 700
- Body: 13–14px / 400–500
- Metadata: 11–12px / 500
- ボタンとラベルは省略しすぎず、非エンジニアが読んで理解できる日本語を使う
- 英語名だけのレイアウトには短い日本語の用途説明を必ず添える

## 5. Spacing and shape

- Base spacing: 4px
- Common gaps: 8 / 12 / 16 / 24px
- Control height: compact 32px / standard 36px
- Radius: controls 6px / cards 10px / dialogs 14px
- Focus ring: 2px `#38BDF8`, 2px offset
- クリック対象は最低32px。アイコン単独操作にはtooltipか`title`を付ける

## 6. Information hierarchy

### Top bar

左から「ルーム」「現在のレイアウト」「OBSへ接続」の順。バックアップと履歴は二次操作としてまとめる。
接続状態とヘルプは右端に固定する。

### Editor body

- 左: 設定入力
- 右: ライブプレビュー
- プレビュー操作はプレビュー上端に置く
- 破壊操作を主要操作の隣で強調しない

### Layout selection

- 文字だけのselectを使わず、16:9ミニプレビュー付きカードで選ぶ
- 「左上」「全幅・中央」「画面下」の用途別に分類する
- 現在選択中、推奨、用途、占有感を視覚的に示す
- カード全体をクリック可能にし、Enter / Spaceでも選択できる
- レイアウト適用時だけ短い状態変化を使う。常時アニメーションは禁止

## 7. Motion

- 状態変化のみ、150–220ms
- `cubic-bezier(.4,0,.2,1)` を基本とする
- `prefers-reduced-motion` を尊重する
- Spinnerを常用せず、接続は状態テキストと色で表す

## 8. Overlay output rules

- ゲーム画面を隠す面積を明示し、左上レイアウトは1920×1080基準で横35%以内を目安にする
- 文字は明暗どちらの背景でも読めること
- OBS出力にはエディタのフォーカス・選択・エラー表示を出さない
- 通信停止時は最後の有効状態を維持する
- 既存ルームの`layoutId`とURLを壊さない

## 9. Anti-patterns

- 見た目を選ぶ機能を文字selectだけで提供する
- 同じ強さのボタンを横一列に大量配置する
- 意味のないグラデーション、ネオン、点滅
- 小さすぎる補足文、英語だけの機能名
- 新機能を追加して初期画面の情報量を増やす
- OBS出力とエディタUIのデザイン責務を混ぜる
