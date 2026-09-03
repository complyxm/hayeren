# Hayeren（アルメニア語学習アプリ）

日本語話者がエレバン（Երևան）で生活できるようになることを目標に、東アルメニア語（改革正書法）の
文字・発音・基本文法・生活語彙をゼロから独習するための、オフラインで動く間隔反復（SRS）ベースの
PWA。詳細な仕様は [`CLAUDE.md`](./CLAUDE.md) と [`docs/`](./docs) を参照。

## 開発コマンド

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド（dist/ に出力）
npm run preview    # ビルド成果物をローカルでプレビュー
npm run test        # Vitest
npm run lint        # ESLint + tsc --noEmit
npm run validate    # content/ の Zod 検証
npm run generate-icons  # public/icons/icon-source.svg から PWA アイコン一式を再生成
```

コミット前に `npm run lint && npm run test && npm run validate` が通ることを確認する。

## デプロイ（Cloudflare Pages）

Cloudflare Pages ダッシュボードで本リポジトリを接続する際の設定値：

| 項目 | 値 |
|---|---|
| フレームワークプリセット | Vite（または None） |
| ビルドコマンド | `npm run build` |
| ビルド出力ディレクトリ | `dist` |
| ルートディレクトリ | `/` |
| 環境変数 | なし（APIキー等は一切不要） |

push するたびに自動デプロイされる状態になっていることを確認する。

## hy-AM Web Speech API 対応状況

`docs/roadmap.md` Phase 0 の要求に基づき、ブラウザ組み込みの音声認識（Web Speech API）が
アルメニア語（`hy-AM`）に対応しているかを実測した記録。測定用ハーネスは
[`public/dev/speech-test.html`](./public/dev/speech-test.html)（`npm run dev` 後に
`http://localhost:5173/dev/speech-test.html` で開く）。

- 測定日：2026-08-23
- ブラウザ / OS：Google Chrome / macOS
- 結果：`lang = "hy-AM"` を指定した認識は `onerror`（`language-not-supported` 等）を出さず、
  `onresult` が発火した（＝完全な未対応ではない）。ただし転写結果はアルメニア文字ではなく
  **ラテン翻字**で返ってきた（例：発話「սիրում ես ինձ」に対し `transcript="sirum es indz"`）。
  また `confidence` は常に `0`。
  → L1 レイヤー（Web Speech API によるフレーズ一致判定、`docs/phonetics.md`）をそのまま使うには、
  アルメニア文字での完全一致判定ができない・信頼度が使えないという2つの制約がある。
  Phase 3 で L1 を採用する場合は、期待文字列側もラテン翻字して比較する、または
  confidence を判定に使わない設計にする必要がある。非対応ではないため実装を止める理由にはならないが、
  L2/L3（音響解析ベース）を主軸に据える方針の妥当性を補強する結果。

## 課金要素ゼロ監査（Phase 0 完了条件）

- 依存パッケージはすべて MIT / Apache-2.0 / OFL-1.1 のいずれかで、npm レジストリからのインストールのみで完結し、APIキーやライセンスキーを一切要求しない（`package.json` 参照）。
- フォント（`Noto Sans Armenian` / `Noto Serif Armenian`）は `@fontsource` パッケージで self-host。ビルド成果物に外部フォントCDNへの参照は含まれない。
- GitHub Actions は無料枠内で完結する想定（プライベートリポジトリの場合は月2,000分の無料枠。ワークフロー1回あたり数分程度）。
- Cloudflare Pages は無料の静的ホスティングプランの上限（1サイト20,000ファイル、1ファイル25MiB、ビルド500回/月、タイムアウト20分）に対し、Phase 0 のビルド成果物は十分小さい。
### Phase 9 時点の再監査（2026-09-03）

Phase 0 の監査を、実際の構成に対して数字で取り直した。

| 項目 | Cloudflare Pages 無料枠 | 実測 | 余裕 |
|---|---|---|---|
| 1サイトのファイル数 | 20,000 | **90**（2026-09-03 の Phase 8 時点。聞き分けの録音20件を含む） | 十分 |
| 1ファイルの上限 | 25 MiB | **最大 3.6 MiB**（`audio/vocab/function-words.wav`） | 十分 |
| 成果物の合計 | （帯域は無制限） | 43 MB | — |
| ビルド回数 | 500 回/月 | 今月 **27 回** | 十分。ただし1コミット1プッシュで運用しているので、1日に数十コミットする日が続くと近づく |

- **サーバーもデータベースも持たない。** 学習の記録はすべて端末内の IndexedDB（Dexie）。
- **有料 API を使っていない。** 本番依存は React / Dexie / ts-fsrs / Zod / Fontsource の
  Armenian フォントだけで、すべて OSS。
- コード中の `fetch` は 2 箇所（`useAlphabetAudio` / `useVocabAudio`）だけで、
  どちらも `import.meta.env.BASE_URL` を前置した**同一オリジンの静的ファイル**を読む。
  外部ホストへの通信ではない。
- 外部にデータが出る機能は Web Speech API（音声認識）だけで、これはブラウザ内蔵で
  課金は発生しない。**既定オフ**で、使うときにユーザーが明示的に同意する。
- フォントは self-host（`@fontsource`）。Google Fonts 等の外部 CDN を叩かない。

- コード中に `fetch` や有料APIの呼び出し箇所はない。`speech-test.html` が使う Web Speech API はブラウザ内蔵機能で課金は発生しないが、音声データが Google 側に送信される外部送信機能である点は明記し、既定オフ（ユーザーの明示操作でのみ起動）の方針を維持する。
