// アルファベット字母名の読み上げ音声スプライトを作る（暫定・自習用）。
//
// 音源は eSpeak NG（GPL-3.0-or-later, フルオープン）の内蔵東アルメニア語音声 `hy`。
// 合成音声の出力は自由に利用・再配布できる。将来的に人間の録音へ差し替える前提。
// CLAUDE.md §2（0円・APIキー不要）と Cloudflare Pages のファイル数上限（1サイト
// 20,000 ファイル）に沿って、字母ごとに mp3 を置くのではなく 1 本の WAV に連結し、
// タイミング JSON を添える。
//
// 使い方:
//   brew install espeak-ng   # 一度だけ（Debian/Ubuntu なら apt-get install espeak-ng）
//   npm run build:audio
//   git add public/audio/alphabet.wav public/audio/alphabet.sprite.json
//
// espeak-ng が無い場合は何もせず終了コード 0 で抜ける（CI やスプライト未生成の環境で
// ビルドを止めないため）。

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ALPHABET_JSON = join(ROOT, "content", "alphabet.json");
const OUT_DIR = join(ROOT, "public", "audio");
const OUT_WAV = join(OUT_DIR, "alphabet.wav");
const OUT_SPRITE = join(OUT_DIR, "alphabet.sprite.json");

/** eSpeak NG の話速（語/分）。字母名は短いので既定よりゆっくりめに。 */
const SPEAK_RATE = 130;
/** 各クリップの後ろに入れる無音（秒）。再生時のセグメント境界のクリック音よけ。 */
const GAP_SECONDS = 0.12;

function haveEspeak() {
  try {
    execFileSync("espeak-ng", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** WAV バイト列から fmt 情報と PCM データ本体を取り出す（余分なチャンクは読み飛ばす）。 */
function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE file");
  }
  let offset = 12;
  let fmt = null;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === "fmt ") {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, body + size);
    }
    offset = body + size + (size % 2); // チャンクは 2 バイト境界にパディングされる
  }
  if (!fmt || !data) throw new Error("missing fmt or data chunk");
  return { fmt, data };
}

/** 単一 data チャンクの canonical な 44 バイトヘッダ + PCM で WAV を組み立てる。 */
function buildWav(fmt, pcm) {
  const header = Buffer.alloc(44);
  const byteRate = (fmt.sampleRate * fmt.channels * fmt.bitsPerSample) / 8;
  const blockAlign = (fmt.channels * fmt.bitsPerSample) / 8;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(fmt.channels, 22);
  header.writeUInt32LE(fmt.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(fmt.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function main() {
  if (!haveEspeak()) {
    console.log("[build:audio] espeak-ng が見つかりません。スキップします（`brew install espeak-ng`）。");
    return;
  }

  const letters = JSON.parse(readFileSync(ALPHABET_JSON, "utf-8"));
  const tmp = join(tmpdir(), `hayeren-audio-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const parts = [];
  const clips = {};
  let cursorBytes = 0;
  let baseFmt = null;
  let silence = null;

  for (const letter of letters) {
    const wavPath = join(tmp, `${letter.id}.wav`);
    execFileSync("espeak-ng", ["-v", "hy", "-s", String(SPEAK_RATE), "-w", wavPath, letter.name], {
      stdio: "ignore",
    });
    const { fmt, data } = parseWav(readFileSync(wavPath));

    if (!baseFmt) {
      baseFmt = fmt;
      const gapBytes = Math.round(GAP_SECONDS * fmt.sampleRate) * ((fmt.channels * fmt.bitsPerSample) / 8);
      silence = Buffer.alloc(gapBytes);
    } else if (
      fmt.sampleRate !== baseFmt.sampleRate ||
      fmt.channels !== baseFmt.channels ||
      fmt.bitsPerSample !== baseFmt.bitsPerSample
    ) {
      throw new Error(`WAV フォーマットが不揃い: ${letter.id} (${JSON.stringify(fmt)})`);
    }

    const bytesPerSecond = (baseFmt.sampleRate * baseFmt.channels * baseFmt.bitsPerSample) / 8;
    clips[letter.id] = {
      start: Number((cursorBytes / bytesPerSecond).toFixed(3)),
      duration: Number((data.length / bytesPerSecond).toFixed(3)),
    };

    parts.push(data, silence);
    cursorBytes += data.length + silence.length;
  }

  const pcm = Buffer.concat(parts);
  writeFileSync(OUT_WAV, buildWav(baseFmt, pcm));

  const sprite = {
    meta: {
      source: "eSpeak NG (hy / Eastern Armenian, built-in voice)",
      kind: "synthesized-interim",
      generatedBy: "scripts/build-alphabet-audio.mjs",
      sampleRate: baseFmt.sampleRate,
      channels: baseFmt.channels,
    },
    clips,
  };
  writeFileSync(OUT_SPRITE, `${JSON.stringify(sprite, null, 2)}\n`);

  const seconds = (pcm.length / ((baseFmt.sampleRate * baseFmt.channels * baseFmt.bitsPerSample) / 8)).toFixed(1);
  console.log(
    `[build:audio] ${Object.keys(clips).length} クリップ / ${seconds}s / ${(pcm.length / 1024).toFixed(0)} KiB`,
  );
  console.log(`  ${OUT_WAV}`);
  console.log(`  ${OUT_SPRITE}`);
}

main();
