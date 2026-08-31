// 語彙の合成音声スプライト（public/audio/vocab/<theme>.sprite.json）と
// content/vocab/*.json の整合をチェックする。npm run validate から呼ばれる。
//
// スプライト未生成の環境（CI 等）では何もせず終了コード 0 で抜ける。
// スプライトがあるのに verified 語との対応が崩れていれば失敗させる
// （= 語彙を足したら `npm run build:audio:vocab` を実行し直す必要がある、の検知）。

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const VOCAB_DIR = join(ROOT, "content", "vocab");
const AUDIO_DIR = join(ROOT, "public", "audio", "vocab");

if (!existsSync(AUDIO_DIR)) {
  console.log("[check:audio] public/audio/vocab/ が無いためスキップ（`npm run build:audio:vocab` で生成）。");
  process.exit(0);
}

const spriteFiles = readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".sprite.json"));
if (spriteFiles.length === 0) {
  console.log("[check:audio] スプライト未生成のためスキップ。");
  process.exit(0);
}

/** theme -> Set<verified entry id> */
const verifiedByTheme = new Map();
for (const file of readdirSync(VOCAB_DIR).filter((f) => f.endsWith(".json"))) {
  const theme = file.replace(/\.json$/, "");
  const ids = new Set();
  for (const e of JSON.parse(readFileSync(join(VOCAB_DIR, file), "utf-8"))) {
    if (e.status === "verified") ids.add(e.id);
  }
  verifiedByTheme.set(theme, ids);
}

const errors = [];

for (const [theme, ids] of verifiedByTheme) {
  if (ids.size === 0) continue;
  if (!spriteFiles.includes(`${theme}.sprite.json`)) {
    errors.push(`テーマ "${theme}" のスプライトが無い`);
    continue;
  }
}

for (const file of spriteFiles) {
  const theme = file.replace(/\.sprite\.json$/, "");
  const sprite = JSON.parse(readFileSync(join(AUDIO_DIR, file), "utf-8"));
  const ids = verifiedByTheme.get(theme) ?? new Set();

  if (sprite.meta?.theme !== theme) errors.push(`${file}: meta.theme が "${sprite.meta?.theme}"（想定 "${theme}"）`);

  for (const key of Object.keys(sprite.clips ?? {})) {
    const baseId = key.endsWith("__ex") ? key.slice(0, -4) : key;
    if (!ids.has(baseId)) errors.push(`${file}: 孤立クリップ "${key}"（対応する verified 語なし）`);
    if (!(sprite.clips[key].duration > 0)) errors.push(`${file}: クリップ "${key}" の duration が 0`);
  }
  for (const id of ids) {
    if (!sprite.clips?.[id]) errors.push(`${file}: 見出し語クリップ "${id}" が欠落`);
    if (!sprite.clips?.[`${id}__ex`]) errors.push(`${file}: 用例文クリップ "${id}__ex" が欠落`);
  }
}

if (errors.length > 0) {
  console.error("[check:audio] 語彙音声スプライトが content/vocab と不整合:");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("  → `npm run build:audio:vocab` を実行し直してください。");
  process.exit(1);
}

const total = spriteFiles.reduce(
  (n, f) => n + Object.keys(JSON.parse(readFileSync(join(AUDIO_DIR, f), "utf-8")).clips ?? {}).length,
  0,
);
console.log(`[check:audio] OK — ${spriteFiles.length} テーマ / ${total} クリップが content/vocab と一致。`);
