// 動詞の活用表を英語版 Wiktionary の描画済みページから読む。
//
// kaikki の抽出（scripts/lookup-kaikki.mjs）には**活用表が入っていない**
// （Wiktionary 側がテンプレートで描画しているため）。活用エンジンが
// 「規則だけでは決まらない」と言った動詞だけ、ここで表を取って
// content/grammar/exceptions.json に**出典付きで**書き写す。
// アオリストを推測で埋めないため（CLAUDE.md §7 / .claude/rules）。
//
// 使い方: node scripts/lookup-conjugation.mjs ներբեռնել վերցնել

import { execFileSync } from "node:child_process";

const UA = "hayeren-dev/1.0 (language-learning app, non-commercial)";

function fetchText(word) {
  const url = `https://en.wiktionary.org/w/api.php?${new URLSearchParams({
    action: "parse",
    page: word,
    format: "json",
    prop: "text",
  })}`;
  const json = JSON.parse(
    execFileSync("curl", ["-sSL", "--retry", "2", "-H", `User-Agent: ${UA}`, url], {
      maxBuffer: 32 * 1024 * 1024,
    }).toString("utf-8"),
  );
  if (json.error) return null;
  return json.parse.text["*"]
    .replace(/<[^>]+>/g, "|")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\|+/g, " ")
    .replace(/[ \t]+/g, " ");
}

/**
 * 表の1行ぶんを、6つの人称の形に切り出す。
 * 各セルは「形 , 口語形 * ( ローマ字 )」の並びなので、**先頭の形だけ**を採る
 * （* 付きは口語形。辞書がそう注記している）。
 */
function row(text, label) {
  const start = text.indexOf(label);
  if (start === -1) return null;
  const slice = text.slice(start + label.length, start + label.length + 700);
  const forms = [...slice.matchAll(/([԰-֏՛]+)(?:\s*,\s*[԰-֏՛]+\s*\*)?\s*\(/g)].map((m) => m[1]);
  return forms.slice(0, 6);
}

for (const word of process.argv.slice(2)) {
  const text = fetchText(word);
  if (!text) {
    console.log(`${word}: ページが無い`);
    continue;
  }
  console.log(`\n== ${word}`);
  for (const label of ["past perfective", "imperative", "aorist stem"]) {
    console.log(`  ${label}: ${JSON.stringify(row(text, label))}`);
  }
}
