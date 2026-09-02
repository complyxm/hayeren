import { describe, expect, it } from "vitest";

/**
 * 配色のコントラスト（roadmap Phase 9 のアクセシビリティ監査）。
 *
 * このアプリの地は**濃い羊皮紙**（parchment #1c1410 / parchment-light #2a1f18）。
 * 顔料そのものの朱 #8c1c13 と青 #2d4a72 をその上に文字色として置くと
 * 1.75〜2.02:1 にしかならず、ほぼ読めない。文字にはコントラストを取った
 * vermillion-text / lapis-text を使う（塗り・枠線は原色のまま）。
 */

// Vite の glob でソースを生のまま読む（node:fs を使うとアプリ側の型定義から外れるため）。
const RAW_SOURCES = import.meta.glob("../**/*.tsx", { eager: true, query: "?raw", import: "default" });
const SOURCES = Object.entries(RAW_SOURCES).filter(([path]) => !path.includes(".test."));

function srgb(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function hex(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = { parchment: "#1c1410", "parchment-light": "#2a1f18" };
const TEXT_COLORS = { ink: "#f3e9d8", gold: "#c9a227", "vermillion-text": "#e0746c", "lapis-text": "#7fa0cc" };

describe("配色のコントラスト", () => {
  it("keeps every text colour readable on both backgrounds (WCAG AA 4.5:1)", () => {
    for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
      for (const [fgName, fg] of Object.entries(TEXT_COLORS)) {
        const ratio = contrast(fg, bg);
        expect(ratio, `${fgName} on ${bgName} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("keeps ink at an opacity that still passes on the lighter background", () => {
    // ink/40 は 3.31:1 で落ちる。小さい文字に使わないよう下限を決めておく。
    const bg = hex("#2a1f18");
    const ink = hex("#f3e9d8");
    const blend = (alpha: number): string =>
      `#${ink.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
    expect(contrast(blend(0.55), "#2a1f18")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(blend(0.5), "#2a1f18")).toBeLessThan(4.5);
  });

  it("never uses the raw pigment colours as a text colour", () => {
    // text-vermillion / text-lapis は 2:1 前後。塗り(bg-)と枠線(border-)は原色のままでよい。
    for (const [file, source] of SOURCES) {
      for (const banned of ["text-vermillion ", 'text-vermillion"', "text-lapis ", 'text-lapis"']) {
        expect(String(source).includes(banned), `${file} が ${banned.trim()} を使っている`).toBe(false);
      }
    }
  });

  it("never uses ink at an opacity below 55%", () => {
    for (const [file, source] of SOURCES) {
      for (const banned of ["text-ink/50", "text-ink/40", "text-ink/30", "text-ink/20"]) {
        expect(String(source).includes(banned), `${file} が ${banned} を使っている`).toBe(false);
      }
    }
  });
});
