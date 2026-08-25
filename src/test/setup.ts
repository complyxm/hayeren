import "@testing-library/jest-dom/vitest";
// jsdom は IndexedDB を実装しないため、Dexie を使うテスト向けにポリフィルする。
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom は matchMedia を実装しないため、既定値（好みなし）で補う。
// usePrefersReducedMotion を使うコンポーネントのテストで必要。
// 個々のテストは vi.spyOn(window, "matchMedia") で上書きできる。
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom は SVG のジオメトリAPIを実装せず、<path> も専用のサブクラス
// (SVGPathElement) を持たない汎用 SVGElement になる。StrokeOrderAnimation は
// getTotalLength() の戻り値をアニメーション用の見た目にしか使わないため、
// 固定値のポリフィルで十分。
if (!("getTotalLength" in window.SVGElement.prototype)) {
  (window.SVGElement.prototype as unknown as { getTotalLength: () => number }).getTotalLength = () => 100;
}

afterEach(() => {
  cleanup();
});
