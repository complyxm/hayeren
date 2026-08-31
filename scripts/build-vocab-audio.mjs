// 語彙（見出し語＋用例文）の読み上げ音声スプライトを作る（暫定・自習用）。
//
// scripts/build-alphabet-audio.mjs と同じ方針。音源は eSpeak NG（GPL-3.0-or-later）の
// 内蔵東アルメニア語音声 `hy`（= hy-arevela / Eastern。西の hyw ではない）。合成音声の
// 出力は自由に利用・再配布できる。将来的に人間の録音へ差し替える前提（CLAUDE.md §2 /
// curriculum.md §4）。
//
// Cloudflare Pages の 1 ファイル 25 MiB 上限に収めるため、1 本にまとめず
// **テーマごと**にスプライトを分ける（public/audio/vocab/<theme>.wav + <theme>.sprite.json）。
// 復習・閲覧時に必要なテーマだけを遅延ロードできる利点もある。
// さらに 22050Hz → 11025Hz に 1/2 ダウンサンプル（近接サンプルの平均＝簡易ローパス）。
// 暫定合成音声なので音質より軽さを優先する。
//
// 使い方:
//   brew install espeak-ng          # 一度だけ（apt-get install espeak-ng）
//   npm run build:audio:vocab
//   git add public/audio/vocab
//
// espeak-ng が無ければ終了コード 0 で抜ける（CI を止めない）。

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const VOCAB_DIR = join(ROOT, "content", "vocab");
const OUT_DIR = join(ROOT, "public", "audio", "vocab");

/** eSpeak NG の話速（語/分）。用例文も含むので字母より速め。 */
const SPEAK_RATE = 145;
/** クリップ間の無音（秒）。セグメント境界のクリック音よけ。 */
const GAP_SECONDS = 0.15;
/** ダウンサンプル係数（22050 / 2 = 11025Hz）。 */
const DECIMATE = 2;

function haveEspeak() {
  try {
    execFileSync("espeak-ng", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

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
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === "data") {
      data = buf.subarray(body, body + size);
    }
    offset = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("missing fmt or data chunk");
  return { fmt, data };
}

/** 16-bit mono PCM を factor 分の 1 に間引く（近接サンプルの平均で簡易ローパス）。 */
function decimate16(pcm, factor) {
  const inSamples = Math.floor(pcm.length / 2);
  const outSamples = Math.floor(inSamples / factor);
  const out = Buffer.alloc(outSamples * 2);
  for (let i = 0; i < outSamples; i += 1) {
    let sum = 0;
    for (let k = 0; k < factor; k += 1) sum += pcm.readInt16LE((i * factor + k) * 2);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sum / factor))), i * 2);
  }
  return out;
}

function buildWav(sampleRate, channels, bitsPerSample, pcm) {
  const header = Buffer.alloc(44);
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function synth(tmpPath, text) {
  execFileSync("espeak-ng", ["-v", "hy", "-s", String(SPEAK_RATE), "-w", tmpPath, text], { stdio: "ignore" });
  return parseWav(readFileSync(tmpPath));
}

function main() {
  if (!haveEspeak()) {
    console.log("[build:audio:vocab] espeak-ng が見つかりません。スキップ（`brew install espeak-ng`）。");
    return;
  }

  const themeFiles = readdirSync(VOCAB_DIR).filter((f) => f.endsWith(".json"));
  const tmp = join(tmpdir(), `hayeren-vocab-audio-${process.pid}`);
  mkdirSync(tmp, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let grandClips = 0;
  let grandBytes = 0;

  for (const file of themeFiles) {
    const theme = file.replace(/\.json$/, "");
    const entries = JSON.parse(readFileSync(join(VOCAB_DIR, file), "utf-8"));

    const parts = [];
    const clips = {};
    let cursorBytes = 0;
    let outRate = null;
    let silence = null;
    const bytesPerSecond = () => outRate * 2; // mono 16-bit

    for (const entry of entries) {
      if (entry.status !== "verified") continue;
      for (const [suffix, text] of [
        ["", entry.hy],
        ["__ex", entry.example.hy],
      ]) {
        const { fmt, data } = synth(join(tmp, `${entry.id}${suffix}.wav`), text);
        if (fmt.channels !== 1 || fmt.bitsPerSample !== 16) {
          throw new Error(`想定外の WAV フォーマット: ${entry.id} ${JSON.stringify(fmt)}`);
        }
        const pcm = DECIMATE > 1 ? decimate16(data, DECIMATE) : data;
        if (outRate === null) {
          outRate = Math.round(fmt.sampleRate / DECIMATE);
          silence = Buffer.alloc(Math.round(GAP_SECONDS * outRate) * 2);
        } else if (Math.round(fmt.sampleRate / DECIMATE) !== outRate) {
          throw new Error(`サンプルレート不揃い: ${entry.id}`);
        }
        clips[`${entry.id}${suffix}`] = {
          start: Number((cursorBytes / bytesPerSecond()).toFixed(3)),
          duration: Number((pcm.length / bytesPerSecond()).toFixed(3)),
        };
        parts.push(pcm, silence);
        cursorBytes += pcm.length + silence.length;
      }
    }

    if (Object.keys(clips).length === 0) continue;

    const pcm = Buffer.concat(parts);
    writeFileSync(join(OUT_DIR, `${theme}.wav`), buildWav(outRate, 1, 16, pcm));
    writeFileSync(
      join(OUT_DIR, `${theme}.sprite.json`),
      `${JSON.stringify(
        {
          meta: {
            theme,
            source: "eSpeak NG (hy / Eastern Armenian, built-in voice)",
            kind: "synthesized-interim",
            generatedBy: "scripts/build-vocab-audio.mjs",
            sampleRate: outRate,
            channels: 1,
            note: "見出し語のキーは entry.id、用例文は entry.id + '__ex'",
          },
          clips,
        },
        null,
        2,
      )}\n`,
    );

    grandClips += Object.keys(clips).length;
    grandBytes += pcm.length;
    console.log(
      `  ${theme}: ${Object.keys(clips).length} クリップ / ${(pcm.length / 1024 / 1024).toFixed(2)} MiB`,
    );
  }

  console.log(
    `[build:audio:vocab] 計 ${grandClips} クリップ / ${(grandBytes / 1024 / 1024).toFixed(1)} MiB → ${OUT_DIR}`,
  );
}

main();
