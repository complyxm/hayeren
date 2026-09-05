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
 * 聞き分けチャレンジ（roadmap 3-2）で使う語。**2項対立ごとに**語を集める。
 *
 * - `p-ph`: 語頭の破裂音（無気無声 պ / 帯気無声 փ）。日本語ではどちらも「パ」。
 * - `rr-r`: 母音にはさまれた ռ（ふるえ音）/ ր（はじき音）。日本語ではどちらも「ラ」。
 *   位置を母音間にそろえてあるのは、語頭・語末では調音が弱まって
 *   ふるえ音でも接触が1回になりやすく、対立が聞こえにくいため。
 * - `gh-kh`: ղ（有声）/ խ（無声）。どちらも日本語に無いのどの奥の摩擦音で、
 *   違いは声帯が鳴るかどうかだけ。ղ は語頭にほとんど立たないので、
 *   **両方とも語中・語末**の語で揃える（片方だけ語頭にすると位置で当てられる）。
 * - `ts-tsh`: ծ（無気）/ ց（帯気）。պ/փ と同じ息の対立が破擦音に出たもの。
 *   日本語ではどちらも「ツ」。
 * - `ch-chh`: ճ（無気）/ չ（帯気）。同じ対立の「チ」版。
 *
 * 摩擦音・破擦音は**産出（自分の声の判定）ではなく知覚で扱う**。判定の閾値を
 * 決めるには較正用の実録音が要り、その当てが無い。較正前の数値をハードコード
 * しない（.claude/rules/audio-dsp.md）。ռ/ր で先に同じ判断をしている。
 *
 * どの語も語彙モジュールに載っている検証済みの語から選んである。
 */
const PAIRS = [
  {
    pairId: "p-ph",
    prefix: "lp",
    words: [
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
    ],
  },
  {
    pairId: "rr-r",
    prefix: "lr",
    words: [
      { word: "առավոտ", letter: "ռ" },
      { word: "հեռու", letter: "ռ" },
      { word: "առաջ", letter: "ռ" },
      { word: "առողջ", letter: "ռ" },
      { word: "առաստաղ", letter: "ռ" },
      { word: "բարև", letter: "ր" },
      { word: "երեկո", letter: "ր" },
      { word: "արագ", letter: "ր" },
      { word: "սիրել", letter: "ր" },
      { word: "գարուն", letter: "ր" },
    ],
  },
  {
    pairId: "gh-kh",
    prefix: "lx",
    words: [
      { word: "աղ", letter: "ղ" },
      { word: "դեղ", letter: "ղ" },
      { word: "փող", letter: "ղ" },
      { word: "մեղր", letter: "ղ" },
      { word: "առողջ", letter: "ղ" },
      { word: "ձախ", letter: "խ" },
      { word: "գլուխ", letter: "խ" },
      { word: "նախաճաշ", letter: "խ" },
      { word: "փոխարեն", letter: "խ" },
      { word: "աշխատանք", letter: "խ" },
    ],
  },
  {
    pairId: "ts-tsh",
    prefix: "lc",
    words: [
      { word: "ծնվել", letter: "ծ" },
      { word: "ծանր", letter: "ծ" },
      { word: "մեծ", letter: "ծ" },
      { word: "ցուրտ", letter: "ց" },
      { word: "հաց", letter: "ց" },
      { word: "բաց", letter: "ց" },
    ],
  },
  {
    pairId: "ch-chh",
    prefix: "lj",
    words: [
      { word: "ճաշ", letter: "ճ" },
      { word: "ճանապարհ", letter: "ճ" },
      { word: "կարճ", letter: "ճ" },
      { word: "աստիճան", letter: "ճ" },
      { word: "անվճար", letter: "ճ" },
      { word: "չոր", letter: "չ" },
      { word: "քիչ", letter: "չ" },
      { word: "կանաչ", letter: "չ" },
      { word: "ինչպես", letter: "չ" },
      { word: "աչք", letter: "չ" },
    ],
  },
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

/** Commons の MP3 トランスコードは要求されて初めて生成されることがあるので、一度だけ待って再試行する。 */
function fetchMp3(originalPath) {
  const fileName = originalPath.split("/").pop();
  const url = `https://upload.wikimedia.org/wikipedia/commons/transcoded/${originalPath}/${fileName}.mp3`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const bytes = curl(url);
      // 404 は HTML のエラーページとして返ってくることがある。
      if (bytes.subarray(0, 4).toString("ascii") === "<!DO") throw new Error("HTML が返ってきた");
      return bytes;
    } catch (e) {
      if (attempt === 1) throw e;
      execFileSync("sleep", ["5"]);
    }
  }
  return null;
}

function fetchPair({ pairId, prefix, words }) {
  const info = fetchInfo(words.map((w) => `File:Hy-${w.word}.ogg`));
  const clips = [];

  // 採番は **words の並び順**で固定する。取得できた件数で採番すると、
  // Commons 側の一時的な失敗（MP3 トランスコードが未生成など）が1件あるだけで
  // 以降のファイル名が全部ずれ、content/listening.json の語と音がすり替わる。
  for (const [index, { word, letter }] of words.entries()) {
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

    const originalPath = new URL(ii.url).pathname.replace(/^\/wikipedia\/commons\//, "");
    let bytes;
    try {
      bytes = fetchMp3(originalPath);
    } catch {
      console.error(`[skip] ${word}: MP3 トランスコードが取れない`);
      continue;
    }

    // ファイル名は ASCII にする。アルメニア文字のままだと URL のエンコードで事故りやすい。
    const outName = `${prefix}-${String(index + 1).padStart(2, "0")}.mp3`;
    writeFileSync(join(OUT_DIR, outName), bytes);

    clips.push({
      pairId,
      word,
      letter,
      file: `audio/listening/${outName}`,
      bytes: bytes.length,
      author,
      license,
      descriptionUrl: decodeURI(ii.descriptionurl ?? `https://commons.wikimedia.org/wiki/File:Hy-${word}.ogg`),
    });
    console.log(`[ok]   ${pairId}  ${word}  ${bytes.length} bytes  ${license}  by ${author}`);
  }

  return clips;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const clips = PAIRS.flatMap(fetchPair);

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

  const total = PAIRS.reduce((n, p) => n + p.words.length, 0);
  console.log(`\n${clips.length}/${total} 件取得。合計 ${clips.reduce((n, c) => n + c.bytes, 0)} bytes`);
  console.log(`クレジットを ${CREDITS_PATH} に書き込んだ。`);

  // content/listening.json に貼るための下書き（語義は人手で埋める）。
  const draft = PAIRS.map(({ pairId }) => ({
    pairId,
    items: clips
      .filter((c) => c.pairId === pairId)
      .map((c, i) => ({
        id: `${PAIRS.find((p) => p.pairId === pairId).prefix}-${String(i + 1).padStart(2, "0")}`,
        word: c.word,
        letter: c.letter,
        audio: c.file,
        source: `音声は Wikimedia Commons の ${c.descriptionUrl}（${c.license}、録音者 ${c.author}）。語義は語彙モジュールで検証済み。`,
      })),
  }));
  writeFileSync(join(ROOT, "content", "listening.draft.json"), `${JSON.stringify(draft, null, 2)}\n`);
  console.log("下書きを content/listening.draft.json に書き出した（語義 ja を埋めて listening.json に反映すること）。");
}

main();
