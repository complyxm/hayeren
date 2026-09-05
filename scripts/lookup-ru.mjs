// ロシア語フレーズを書く前の下調べ（docs/russian.md）。英語版 Wiktionary の
// **ロシア語の節**から、語義と丁寧さ・数の注記（formal / plural / imperative など）を引く。
//
// アルメニア語と違って kaikki の抽出をまるごと持ってくるには辞書が大きすぎるので、
// こちらは API を使う。ただし1語ずつ叩くと速度制限に当たるため、
// **50語をまとめて1回**で取る（action=query の titles は複数可）。
//
// 丁寧さを外すと実地で失礼になるので、вы 形かどうかを必ず目視で確かめること
// （docs/russian.md §7「ты / вы が検証済みで、unverified が出題されない」）。
//
// 使い方: node scripts/lookup-ru.mjs извините остановите сдача

import { execFileSync } from "node:child_process";

const UA = "hayeren-dev/1.0 (language-learning app, non-commercial)";

function api(params) {
  const url = `https://en.wiktionary.org/w/api.php?${new URLSearchParams(params)}`;
  return JSON.parse(
    execFileSync("curl", ["-sSL", "--retry", "2", "-H", `User-Agent: ${UA}`, url], {
      maxBuffer: 64 * 1024 * 1024,
    }).toString("utf-8"),
  );
}

/** ==Russian== の節だけを取り出す（他言語と混ぜない）。 */
function russianSection(wikitext) {
  const start = wikitext.indexOf("==Russian==");
  if (start === -1) return null;
  const rest = wikitext.slice(start + "==Russian==".length);
  const end = rest.search(/\n==[^=]/);
  return end === -1 ? rest : rest.slice(0, end);
}

function clean(line) {
  return line
    .replace(/\{\{lb\|ru\|([^}]*)\}\}/g, (_, labels) => `(${labels.split("|").join(", ")})`)
    .replace(/\{\{(?:inflection of|infl of)\|ru\|([^|}]*)\|\|([^}]*)\}\}/g, (_, lemma, tags) => `→ ${lemma} の ${tags.split("|").join(" ")}`)
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const words = process.argv.slice(2);
const results = [];

for (let i = 0; i < words.length; i += 40) {
  const batch = words.slice(i, i + 40);
  const json = api({
    action: "query",
    format: "json",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: batch.join("|"),
  });
  const pages = Object.values(json.query.pages);
  for (const page of pages) {
    const text = page.revisions?.[0]?.slots?.main?.["*"];
    if (!text) {
      results.push({ word: page.title, found: false });
      continue;
    }
    const section = russianSection(text);
    if (section === null) {
      results.push({ word: page.title, found: false, reason: "ロシア語の項目が無い" });
      continue;
    }
    const definitions = section
      .split("\n")
      .filter((line) => /^#[^#*:]/.test(line))
      .map((line) => clean(line.slice(1)))
      .filter(Boolean);
    const partsOfSpeech = [...section.matchAll(/\n===+\s*([A-Za-z ]+?)\s*=+/g)]
      .map((m) => m[1])
      .filter((h) => !["Etymology", "Pronunciation", "References", "Declension", "Conjugation", "Derived terms", "Related terms", "Descendants", "Synonyms", "Antonyms", "See also", "Further reading", "Alternative forms", "Anagrams"].includes(h));
    results.push({ word: page.title, found: true, partsOfSpeech, definitions: definitions.slice(0, 6) });
  }
}

console.log(JSON.stringify(results, null, 2));
