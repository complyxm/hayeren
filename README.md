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

- 測定日：（未測定）
- ブラウザ / OS：（未測定）
- 結果：（未測定 — 非対応でも Phase 3 は L2/L3（音響解析ベース）のみで成立するため、ここで実装を止めない）

## 課金要素ゼロ監査（Phase 0 完了条件）

- 依存パッケージはすべて MIT / Apache-2.0 / OFL-1.1 のいずれかで、npm レジストリからのインストールのみで完結し、APIキーやライセンスキーを一切要求しない（`package.json` 参照）。
- フォント（`Noto Sans Armenian` / `Noto Serif Armenian`）は `@fontsource` パッケージで self-host。ビルド成果物に外部フォントCDNへの参照は含まれない。
- GitHub Actions は無料枠内で完結する想定（プライベートリポジトリの場合は月2,000分の無料枠。ワークフロー1回あたり数分程度）。
- Cloudflare Pages は無料の静的ホスティングプランの上限（1サイト20,000ファイル、1ファイル25MiB、ビルド500回/月、タイムアウト20分）に対し、Phase 0 のビルド成果物は十分小さい。
- コード中に `fetch` や有料APIの呼び出し箇所はない。`speech-test.html` が使う Web Speech API はブラウザ内蔵機能で課金は発生しないが、音声データが Google 側に送信される外部送信機能である点は明記し、既定オフ（ユーザーの明示操作でのみ起動）の方針を維持する。
