// Wikimedia Commons のアルメニア語発音ファイルを取得する。
//
// curriculum.md §4 の調達順「Common Voice hy-AM CC0 → Wikimedia Commons / Wiktionary
// CC BY-SA」の2番目。**CC BY-SA は帰属表示が必須**なので、音声そのものと一緒に
// 作者名・ライセンス・元ページの URL を必ず取り、content/audio-credits.json に残す。
// 帰属が取れなかったファイルは落とす（黙って使わない）。
//
// 実体は Ogg Vorbis だが、Commons は MP3 のトランスコードも配っている。
// MP3 のほうが小さく、古い Safari でも再生できるのでそちらを取る。
//
// 使い方:
//   node scripts/fetch-commons-audio.mjs
//   git add public/audio/listening/ content/audio-credits.json

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "audio", "listening");
const CREDITS_PATH = join(ROOT, "content", "audio-credits.json");
const UA = "hayeren-dev/1.0 (https://github.com/; language-learning app, non-commercial)";

/**
 * 聞き分けチャレンジ（roadmap 3-2）で使う語。**語頭の破裂音だけが問題**なので、
 * 無気無声（պ）と帯気無声（փ）で始まる語をそれぞれ集める。
 * 語彙モジュールに載っている検証済みの語から選んである。
 */
const WORDS = [
  { word: "պատ", letter: "պ" },
  { word: "պապ", letter: "պ" },
  { word: "պարկ", letter: "պ" },
  { word: "պանիր", letter: "պ" },
  { word: "պայմանագիր", letter: "պ" },
  { word: "փող", letter: "փ" },
  { word: "փոր", letter: "փ" },
  { word: "փակ", letter: "փ" },
  { word: "փողոց", letter: "փ" },
  { word: "փոխարեն", letter: "փ" },
];

function curl(url, extra = []) {
  return execFileSync("curl", ["-sSL", "-H", `User-Agent: ${UA}`, ...extra, url], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** extmetadata の値は HTML なので、タグを剥がして素の文字列にする。 */
function plain(html) {
  if (!html) return null;
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function fetchInfo(titles) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    titles: titles.join("|"),
  });
  const json = JSON.parse(curl(`https://commons.wikimedia.org/w/api.php?${params}`).toString("utf-8"));
  const pages = Object.values(json.query.pages);
  return new Map(pages.map((p) => [p.title, p]));
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const titles = WORDS.map((w) => `File:Hy-${w.word}.ogg`);
  const info = fetchInfo(titles);

  const clips = [];
  for (const { word, letter } of WORDS) {
    const page = info.get(`File:Hy-${word}.ogg`);
    if (!page || page.missing !== undefined) {
      console.error(`[skip] ${word}: Commons にファイルが無い`);
      continue;
    }
    const ii = page.imageinfo[0];
    const meta = ii.extmetadata ?? {};
    const author = plain(meta.Artist?.value);
    const license = plain(meta.LicenseShortName?.value);
    if (!author || !license) {
      // 帰属が取れないものは使わない（CC BY-SA は表示が必須）。
      console.error(`[skip] ${word}: 作者かライセンスが取れない`);
      continue;
    }

    // MP3 トランスコードの URL は原本のパスから決まる。
    const originalPath = new URL(ii.url).pathname.replace(/^\/wikipedia\/commons\//, "");
    const fileName = originalPath.split("/").pop();
    const mp3Url = `https://upload.wikimedia.org/wikipedia/commons/transcoded/${originalPath}/${fileName}.mp3`;

    const bytes = curl(mp3Url);
    // ファイル名は ASCII にする。アルメニア文字のままだと URL のエンコードで事故りやすい。
    const outName = `lp-${String(clips.length + 1).padStart(2, "0")}.mp3`;
    writeFileSync(join(OUT_DIR, outName), bytes);

    clips.push({
      word,
      letter,
      file: `audio/listening/${outName}`,
      bytes: bytes.length,
      author,
      license,
      descriptionUrl: decodeURI(ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:Hy-${word}.ogg`),
    });
    console.log(`[ok]   ${word}  ${bytes.length} bytes  ${license}  by ${author}`);
  }

  // クレジットは content/audio-credits.json にファイル単位で残す。
  const credits = JSON.parse(readFileSync(CREDITS_PATH, "utf-8"));
  credits.entries = credits.entries.filter((e) => e.scope !== "listening");
  credits.entries.push({
    scope: "listening",
    kind: "recorded",
    source: "Wikimedia Commons（アルメニア語の発音ファイル）",
    sourceUrl: "https://commons.wikimedia.org/wiki/Category:Armenian_pronunciation",
    license: "各ファイルの license を参照（CC BY-SA。帰属表示が必要）",
    generatedBy: "scripts/fetch-commons-audio.mjs",
    noteJa:
      "聞き分けチャレンジ（roadmap 3-2）用の人間の録音。Commons の MP3 トランスコードをそのまま置いている（変換も加工もしていない）。CC BY-SA は帰属表示が必須なので、ファイルごとの作者・ライセンス・元ページを files に持ち、アプリのクレジット画面に出す。",
    files: clips.map(({ word, file, author, license, descriptionUrl }) => ({
      word,
      file,
      author,
      license,
      descriptionUrl,
    })),
  });
  writeFileSync(CREDITS_PATH, `${JSON.stringify(credits, null, 2)}\n`);

  console.log(`\n${clips.length}/${WORDS.length} 件取得。合計 ${clips.reduce((n, c) => n + c.bytes, 0)} bytes`);
  console.log(`クレジットを ${CREDITS_PATH} に書き込んだ。`);
}

main();
