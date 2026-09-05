// 語彙を書く前の下調べ。英語版 Wiktionary の機械可読版（kaikki.org の抽出）から、
// **東アルメニア語の**発音・語義・語形・音声の有無をまとめて引く。
//
// CLAUDE.md §7「言語データを推測で埋めてはいけない」。語を1つ足すたびに
// 綴り・品詞・語義・IPA を出典で確かめる。Wiktionary の API を1語ずつ叩くと
// 速度制限（HTTP 429）に当たるうえ、東西の取り違えも起きやすい。kaikki の
// 抽出は発音に Eastern-Armenian / Western-Armenian のタグが付いているので、
// **東だけを機械的に選べる**（CLAUDE.md §0 の最重要事項）。
//
// 辞書データの入手（無料。CC BY-SA 4.0。Wiktionary の派生物なので同じ条件）:
//   curl -o kaikki-hy.jsonl https://kaikki.org/dictionary/Armenian/kaikki.org-dictionary-Armenian.jsonl
//   （約160MB。リポジトリには入れない。作業用ディレクトリに置く）
//
// 使い方:
//   HAYEREN_KAIKKI=/path/kaikki-hy.jsonl node scripts/lookup-kaikki.mjs խնձոր տանձ
//   HAYEREN_KAIKKI=... node scripts/lookup-kaikki.mjs --file words.txt > out.json

import { createReadStream, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const dumpPath = process.env.HAYEREN_KAIKKI;
if (!dumpPath) {
  console.error("HAYEREN_KAIKKI に kaikki の jsonl のパスを指定してください（取得方法はこのファイルの先頭）。");
  process.exit(1);
}

const args = process.argv.slice(2);
const words = args[0] === "--file" ? readFileSync(args[1], "utf-8").split(/\s+/).filter(Boolean) : args;
const wanted = new Set(words);

/** 東アルメニア語の音だけを拾う。西の値を混ぜない（CLAUDE.md §0）。 */
function easternSounds(entry) {
  const sounds = entry.sounds ?? [];
  const isEastern = (s) => (s.tags ?? []).includes("Eastern-Armenian");
  return {
    // 音素表記（/…/）。異音の [ … ] は参考なので採らない。
    ipa: sounds.find((s) => isEastern(s) && s.ipa?.startsWith("/"))?.ipa ?? null,
    mp3: sounds.find((s) => isEastern(s) && s.mp3_url)?.mp3_url ?? null,
  };
}

const byWord = new Map();
const reader = createInterface({ input: createReadStream(dumpPath), crlfDelay: Infinity });

for await (const line of reader) {
  // 160MB を JSON.parse し続けるのは無駄なので、候補語を含む行だけを解く。
  let hit = false;
  for (const word of wanted) {
    if (line.includes(`"${word}"`)) {
      hit = true;
      break;
    }
  }
  if (!hit) continue;

  const entry = JSON.parse(line);
  if (entry.lang_code !== "hy" || !wanted.has(entry.word)) continue;

  const { ipa, mp3 } = easternSounds(entry);
  const senses = (entry.senses ?? [])
    .flatMap((s) => s.glosses ?? [])
    .filter((g) => !/^(alternative|obsolete) (form|spelling)/i.test(g));

  const existing = byWord.get(entry.word) ?? [];
  existing.push({
    pos: entry.pos,
    ipa,
    romanization: entry.forms?.find((f) => (f.tags ?? []).includes("romanization"))?.form ?? null,
    glosses: senses,
    // 不規則形の確認用。規則どおりの語は空になることも多い。
    forms: (entry.forms ?? [])
      .filter((f) => (f.tags ?? []).some((t) => ["genitive", "plural", "definite", "dative"].includes(t)))
      .slice(0, 8)
      .map((f) => ({ form: f.form, tags: f.tags })),
    audioMp3: mp3,
  });
  byWord.set(entry.word, existing);
}

const results = words.map((word) => ({
  word,
  found: byWord.has(word),
  entries: byWord.get(word) ?? [],
  url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Armenian`,
}));

console.log(JSON.stringify(results, null, 2));
