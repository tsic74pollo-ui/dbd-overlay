# LocalVocal セットアップガイド

dbd-overlay の **画面下キャプション(音声→翻訳字幕)** 機能は、OBS プラグイン
[LocalVocal](https://github.com/locaal-ai/obs-localvocal) と連携して動作します。

LocalVocal が音声キャプチャ → Whisper STT → 翻訳まで全部担当し、結果を
WebSocket で dbd-overlay に流す構成です。dbd-overlay 側は WebSocket で
受信して、Supabase 経由で /overlay の Browser Source に字幕として表示します。

---

## 1. LocalVocal プラグインを OBS にインストール

### Windows

1. [GitHub Releases ページ](https://github.com/locaal-ai/obs-localvocal/releases) を開く
2. **最新の安定版**(例: `v0.0.x`)から `obs-localvocal-windows-x64-Installer.exe` をダウンロード
3. インストーラ実行(OBS インストール先を指定)
4. OBS Studio を再起動
5. 確認: OBS で任意のオーディオソースを右クリック → 「フィルタ」 → 「+」 で
   **「LocalVocal: AI Captions」** が選べれば成功

### macOS / Linux
GitHub Releases から該当バイナリをダウンロード。詳細は公式 README 参照。

---

## 2. オーディオソースにフィルタを追加

1. OBS で、字幕にしたい **オーディオソース(マイク or デスクトップ音声)** を右クリック
2. 「フィルタ」 を選択
3. 左下の「+」 → 「LocalVocal: AI Captions」 を追加
4. フィルタ設定ダイアログが開く

### モデル選択(Whisper STT)

| モデル | サイズ | 推奨 |
|---|---|---|
| Tiny | 約 75MB | 軽量だが精度低、テスト用 |
| Base | 約 140MB | バランス |
| Small | 約 460MB | おすすめ(CPU でも実用速度) |
| Medium | 約 1.4GB | 高精度、要 GPU 推奨 |
| Large | 約 2.8GB | 最高精度、要 GPU、CUDA / RTX 4060 SUPER 等で実時間 |

**最初は Small で試して** 、精度に不満があれば Medium / Large に上げる流れがおすすめ。

### 言語設定

- **Language**: Japanese を選択
- **Translate To**: English を選択(これで JA→EN 翻訳が走る)

---

## 3. 翻訳設定

「Translation」 タブ:

- **Provider**:
  - **NLLB**(内蔵、無料、品質中):一番手軽。最初はこれ
  - **Google Translate**(API キー必要、有料):品質高
  - **OpenAI 互換**(GPT 等):API キー必要
- **Target Language**: English

---

## 4. WebSocket 出力を有効化

「Output」 タブ:

- **Send to**: 「WebSocket」 にチェック
- **Host**: `127.0.0.1`(同じ PC で dbd-overlay を動かす場合)
- **Port**: 任意。既定 `9999` のままで OK
- 「OK」 で保存

### 確認

OBS 起動中なら、Windows コマンドプロンプトで:

```cmd
netstat -an | findstr :9999
```

`LISTENING` 行が出れば OK。

---

## 5. dbd-overlay 側で接続

1. dbd-overlay エディタを開く
2. 設定パネル → 「**LocalVocal 連携(音声→翻訳字幕)**」 セクション
3. 「有効」 ON
4. **WebSocket URL** に `ws://127.0.0.1:9999` を入力(LocalVocal で指定したポート)
5. 接続状態が 緑「接続済み」 になれば成功

### 字幕ウィジェット表示

1. 設定パネル → 「**キャプション字幕(画面下)**」 セクション
2. 「表示」 ON
3. JA / EN それぞれ表示するか、色、位置 等をお好みで

---

## 6. 動作確認

1. OBS のマイクで日本語を話す
2. 数秒待つ(モデル + 翻訳の処理時間で 2〜4 秒の遅延が生じる)
3. `/overlay?room=<id>` ページの画面下に JA + EN 字幕が出れば成功

---

## 7. トラブルシューティング

### 字幕が出ない

| 症状 | 対処 |
|---|---|
| dbd-overlay の接続状態が 赤「未接続」 | OBS 起動中か / LocalVocal の Output WebSocket が ON か確認 |
| 接続状態は 緑だが字幕が出ない | OBS フィルタの **Output WebSocket が有効か** 再確認 |
| LocalVocal のフィルタが出てこない | プラグインインストール後に OBS を再起動したか確認 |
| マイクで話しているが日本語認識されない | フィルタの Language が "Japanese" になっているか確認 |
| 翻訳が出ない | フィルタの Translate To "English" + Provider 設定確認 |

### レイテンシが大きい

- Whisper モデルを **小さく**(Medium → Small → Base 等)
- GPU 推論を有効化(NVIDIA RTX シリーズ + CUDA Toolkit)

### 字幕の意味が変

- 「Translation Provider」 を NLLB から Google Translate / OpenAI 互換 等に変更
- ノイズが多い環境なら **Whisper モデルを Large** に上げて認識精度向上

---

## 8. 既存機能との関係

- **OBS WebSocket 連携(V2.2)** とは **完全独立**。同時に有効化可能
  (片方が OBS 4455、片方が LocalVocal 9999 という別ポート)
- **バイリンガル表示(secondaryText)** とも併存可能
  (静的ラベル = バイリンガル、動的字幕 = キャプション)

---

## 9. プライバシー

- 音声処理は **すべてローカル**(LocalVocal が PC 上で Whisper を動かす)
- ネットワーク送信なし(NLLB 翻訳の場合)
- Google Translate / OpenAI 翻訳を使う場合のみ、テキストが外部 API に送られる

---

参考リンク:
- LocalVocal GitHub: <https://github.com/locaal-ai/obs-localvocal>
- Whisper(OpenAI): <https://openai.com/research/whisper>
