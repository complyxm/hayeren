// 英語版 Wiktionary から、語の検証に必要な事実だけを取り出す（語彙を書く前の下調べ用）。
//
// CLAUDE.md §7「言語データを推測で埋めてはいけない」。語を1つ足すたびに
// 綴り・品詞・語義・**東アルメニア語の** IPA を出典で確かめる。
//
// 東西の取り違えがいちばん怖い（CLAUDE.md §0）。Wiktionary は
// 「(Eastern Armenian) IPA: …」「(Western Armenian) IPA: …」を別行で出すので、
// **描画済みの本文から Eastern の行だけ**を取る（要約に頼らない）。
//
// 使い方:
//   node scripts/lookup-wiktionary.mjs խնձոր տանձ խաղող
//   node scripts/lookup-wiktionary.mjs --file words.txt > out.json

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const UA = "hayeren-dev/1.0 (language-learning app, non-commercial)";

/** 連投すると接続を切られる。間を空け、切られたら少し待って数回だけやり直す。 */
function api(params) {
  const url = `https://en.wiktionary.org/w/api.php?${new URLSearchParams(params)}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const out = execFileSync("curl", ["-sSL", "--retry", "2", "-H", `User-Agent: ${UA}`, url], {
        maxBuffer: 32 * 1024 * 1024,
      });
      return JSON.parse(out.toString("utf-8"));
    } catch (e) {
      if (attempt >= 3) throw e;
      execFileSync("sleep", [String(2 * (attempt + 1))]);
    }
  }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ");
}

/** 描画済み本文から東アルメニア語の IPA を取る。無ければ null（推測しない）。 */
function easternIpa(text) {
  const match = text.match(/\(\s*Eastern Armenian\s*\)\s*IPA[^:]*:\s*(\/[^/]+\/)/);
  return match ? match[1] : null;
}

/** ==Armenian== 節だけを取り出す（Old Armenian や他言語と混ぜない）。 */
function armenianSection(wikitext) {
  const start = wikitext.indexOf("==Armenian==");
  if (start === -1) return null;
  const rest = wikitext.slice(start + "==Armenian==".length);
  const end = rest.search(/\n==[^=]/);
  return end === -1 ? rest : rest.slice(0, end);
}

/** テンプレートやリンクの記法を落として、語義の行だけを読めるようにする。 */
function cleanDefinition(line) {
  return line
    .replace(/\{\{lb\|hy\|([^}]*)\}\}/g, (_, labels) => `(${labels.split("|").join(", ")})`)
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/'{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lookup(word) {
  const parsed = api({ action: "parse", page: word, format: "json", prop: "wikitext|text" });
  if (parsed.error) return { word, found: false, reason: parsed.error.code };

  const wikitext = parsed.parse.wikitext["*"];
  const section = armenianSection(wikitext);
  if (section === null) return { word, found: false, reason: "アルメニア語の項目が無い" };

  const text = stripHtml(parsed.parse.text["*"]);
  const partsOfSpeech = [...section.matchAll(/\n===+\s*([A-Za-z ]+?)\s*=+/g)]
    .map((m) => m[1])
    .filter((h) => !["Etymology", "Pronunciation", "References", "Declension", "Conjugation", "Derived terms", "Related terms", "Descendants", "Synonyms", "Antonyms", "See also", "Further reading", "Alternative forms"].includes(h));

  const definitions = section
    .split("\n")
    .filter((line) => /^#[^#*:]/.test(line))
    .map((line) => cleanDefinition(line.slice(1)))
    .filter(Boolean);

  const inflection = [...section.matchAll(/\{\{(hy-(?:noun|conj|adj)[^|}]*)/g)].map((m) => m[1]);

  return {
    word,
    found: true,
    easternIpa: easternIpa(text),
    partsOfSpeech,
    definitions,
    inflection,
    hasEasternAudio: /Audio \( Eastern Armenian \)/.test(text),
    url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Armenian`,
  };
}

const args = process.argv.slice(2);
const words =
  args[0] === "--file"
    ? readFileSync(args[1], "utf-8").split(/\s+/).filter(Boolean)
    : args;

const results = [];
for (const word of words) {
  results.push(lookup(word));
  // 途中で落ちても、そこまでの結果は残す（1語ずつ書き出す）。
  console.error(`[${results.length}/${words.length}] ${word}`);
  execFileSync("sleep", ["0.4"]);
}
console.log(JSON.stringify(results, null, 2));
