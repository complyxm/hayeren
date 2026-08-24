// content/alphabet.json の lowerStrokes（なぞり書き用の筆順ストローク）を
// 生成し直すためのスクリプト。通常の `npm run` フローには含めない
// （フォントを差し替えたときなど、必要になったら手動で実行する）。
//
// 手順:
//   1. opentype.js (MIT) で自前ホストしている Noto Sans Armenian から
//      各小文字の実際のグリフ輪郭を取り出し、共通の 100x120 viewBox に正規化する。
//   2. その輪郭をラスタライズし、skeleton-tracing-js (MIT, LingDong Huang) で
//      中心線をポリラインとして抽出する。フォントのアウトラインは通常1つの
//      閉じた輪郭なので、輪郭そのものではなく中心線を使うことで
//      「複数ストロークで書く」筆順学習の体裁になる。
//   3. 各ストロークを「縦長なら上→下、横長なら左→右」という一般的な
//      手書き規則で向きを揃え、ストローク間の順序も同じ規則で並べる。
//      これは公式の書き順規定ではなく学習用の推定値（ユーザー合意済み、
//      CLAUDE.md 参照）。
//   4. content/alphabet.json の各エントリの lowerStrokes に書き戻す。
//      Ւ（単独では使われない）は対象外で null のまま。
//
// 実行: node scripts/generate-alphabet-strokes.mjs
// 出力後、生成された各文字のストロークを目視確認すること
// （fill-opacity 0.25 で実グリフを下敷きにした確認用SVGを作るとよい）。

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const TraceSkeleton = require("skeleton-tracing-js");

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FONT_PATH = join(
  ROOT,
  "node_modules/@fontsource/noto-sans-armenian/files/noto-sans-armenian-armenian-400-normal.woff",
);
const ALPHABET_PATH = join(ROOT, "content/alphabet.json");

const BOX = { x1: 8, y1: 8, x2: 92, y2: 112 }; // 0 0 100 120 viewBox内の正規化先
const RES_SCALE = 5; // ラスタライズ解像度倍率
const CHUNK_SIZE = 45; // skeleton-tracing のチャンクサイズ（大きいほどループ付近の過分割が減る）
const MIN_STROKE_LEN = 6; // これより短いポリラインはノイズとして捨てる（ラスタpx基準）
const SIMPLIFY_TOLERANCE = 1.2; // Ramer-Douglas-Peucker 許容誤差（0-100スケール基準）

function loadFont() {
  const buffer = readFileSync(FONT_PATH);
  return opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}

function cmdsToD(cmds) {
  return cmds
    .map((c) => {
      switch (c.type) {
        case "M":
          return `M${c.x.toFixed(2)},${c.y.toFixed(2)}`;
        case "L":
          return `L${c.x.toFixed(2)},${c.y.toFixed(2)}`;
        case "C":
          return `C${c.x1.toFixed(2)},${c.y1.toFixed(2)} ${c.x2.toFixed(2)},${c.y2.toFixed(2)} ${c.x.toFixed(2)},${c.y.toFixed(2)}`;
        case "Q":
          return `Q${c.x1.toFixed(2)},${c.y1.toFixed(2)} ${c.x.toFixed(2)},${c.y.toFixed(2)}`;
        case "Z":
          return "Z";
        default:
          return "";
      }
    })
    .join(" ");
}

function normalizePath(cmds, bbox) {
  const srcW = bbox.x2 - bbox.x1 || 1;
  const srcH = bbox.y2 - bbox.y1 || 1;
  const scale = Math.min((BOX.x2 - BOX.x1) / srcW, (BOX.y2 - BOX.y1) / srcH);
  const destW = srcW * scale;
  const destH = srcH * scale;
  const offsetX = BOX.x1 + ((BOX.x2 - BOX.x1) - destW) / 2 - bbox.x1 * scale;
  const offsetY = BOX.y1 + ((BOX.y2 - BOX.y1) - destH) / 2 - bbox.y1 * scale;
  return cmds.map((c) => {
    const out = { type: c.type };
    for (const k of ["x", "y", "x1", "y1", "x2", "y2"]) {
      if (c[k] !== undefined) out[k] = k.startsWith("x") ? c[k] * scale + offsetX : c[k] * scale + offsetY;
    }
    return out;
  });
}

function referencePathFor(font, chars) {
  // chars: 1文字、または ու/և のような複数文字の並び
  const glyphs = [...chars].map((ch) => font.charToGlyph(ch));
  let x = 0;
  const paths = [];
  for (const g of glyphs) {
    paths.push(g.getPath(x, 0, 1000));
    x += g.advanceWidth * (1000 / font.unitsPerEm);
  }
  const bbox = {
    x1: Math.min(...paths.map((p) => p.getBoundingBox().x1)),
    y1: Math.min(...paths.map((p) => p.getBoundingBox().y1)),
    x2: Math.max(...paths.map((p) => p.getBoundingBox().x2)),
    y2: Math.max(...paths.map((p) => p.getBoundingBox().y2)),
  };
  const cmds = normalizePath(
    paths.flatMap((p) => p.commands),
    bbox,
  );
  return cmdsToD(cmds);
}

async function rasterize(d) {
  const w = 100 * RES_SCALE;
  const h = 120 * RES_SCALE;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 120"><path d="${d}" fill="#000"/></svg>`;
  const { data, info } = await sharp(Buffer.from(svg))
    .flatten({ background: "#fff" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bools = new Array(info.width * info.height);
  for (let i = 0; i < bools.length; i++) bools[i] = data[i] < 128 ? 1 : 0;
  return { bools, w: info.width, h: info.height };
}

function orientStroke(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const first = points[0];
  const last = points[points.length - 1];
  const shouldReverse = height >= width ? first[1] > last[1] : first[0] > last[0];
  return shouldReverse ? [...points].reverse() : points;
}

function orderPolylines(polylines) {
  const withBounds = polylines.map((p) => ({
    p,
    minY: Math.min(...p.map((pt) => pt[1])),
    minX: Math.min(...p.map((pt) => pt[0])),
  }));
  withBounds.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  return withBounds.map((x) => x.p);
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  function perpDist(pt, a, b) {
    const [x, y] = pt;
    const [x1, y1] = a;
    const [x2, y2] = b;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / len;
  }
  function rdp(pts) {
    if (pts.length < 3) return pts;
    let maxDist = -1;
    let idx = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > tolerance) {
      return [...rdp(pts.slice(0, idx + 1)).slice(0, -1), ...rdp(pts.slice(idx))];
    }
    return [pts[0], pts[pts.length - 1]];
  }
  return rdp(points);
}

function toPathD(points) {
  return points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(" ");
}

async function strokesFor(font, chars) {
  const d = referencePathFor(font, chars);
  const { bools, w, h } = await rasterize(d);
  const result = TraceSkeleton.trace(bools, w, h, CHUNK_SIZE);
  let polylines = result.polylines.filter((p) => {
    let len = 0;
    for (let i = 1; i < p.length; i++) len += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    return len >= MIN_STROKE_LEN;
  });
  polylines = polylines.map((p) => p.map(([x, y]) => [x / RES_SCALE, y / RES_SCALE]));
  polylines = polylines.map(orientStroke);
  polylines = orderPolylines(polylines);
  return polylines.map((points, i) => ({ order: i + 1, d: toPathD(simplify(points, SIMPLIFY_TOLERANCE)) }));
}

async function main() {
  const font = loadFont();
  const alphabet = JSON.parse(readFileSync(ALPHABET_PATH, "utf-8"));

  for (const entry of alphabet) {
    if (entry.id === "hyun") {
      entry.lowerStrokes = null;
      continue;
    }
    entry.lowerStrokes = await strokesFor(font, entry.lower);
  }

  writeFileSync(ALPHABET_PATH, JSON.stringify(alphabet, null, 2) + "\n");
  console.log(`updated lowerStrokes for ${alphabet.length} entries in content/alphabet.json`);
}

main();
