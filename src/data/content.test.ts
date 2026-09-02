import { describe, expect, it } from "vitest";
import alphabetRaw from "../../content/alphabet.json";
import punctuationRaw from "../../content/punctuation.json";
import metroRaw from "../../content/metro.json";
import { alphabetSchema } from "./schemas/alphabet";
import { punctuationSchema } from "./schemas/punctuation";
import { metroSchema } from "./schemas/metro";
import { vocab } from "./vocab";

// アルメニア文字は U+0530–U+058F の範囲のみを使う（見た目の似たラテン/キリル文字の
// 混入を防ぐ）。CLAUDE.md §6-1。App.test.tsx と同じ範囲を使う。
const ARMENIAN_ONLY = /^[԰-֏\s]+$/;
// 語彙の例文は読点(、に相当する ",")を含む完全な文になるため、上の範囲に加えて
// 半角カンマだけを許容する(ラテン文字の混入検出という目的は変えない)。
const ARMENIAN_SENTENCE = /^[԰-֏\s,]+$/;

describe("content/alphabet.json", () => {
  const alphabet = alphabetSchema.parse(alphabetRaw);

  it("has exactly 38 letters plus the ու digraph and և ligature (roadmap Phase 1)", () => {
    const letters = alphabet.filter((entry) => entry.type === "letter");
    const digraphs = alphabet.filter((entry) => entry.type === "digraph");
    const ligatures = alphabet.filter((entry) => entry.type === "ligature");
    expect(letters).toHaveLength(38);
    expect(digraphs).toHaveLength(1);
    expect(ligatures).toHaveLength(1);
    expect(alphabet).toHaveLength(40);
  });

  it("does not mix look-alike Latin/Cyrillic characters into Armenian-script fields", () => {
    for (const entry of alphabet) {
      expect(entry.upper, `${entry.id}.upper`).toMatch(ARMENIAN_ONLY);
      expect(entry.lower, `${entry.id}.lower`).toMatch(ARMENIAN_ONLY);
      expect(entry.name, `${entry.id}.name`).toMatch(ARMENIAN_ONLY);
      for (const word of entry.exampleWords) {
        expect(word.hy, `${entry.id} example word "${word.hy}"`).toMatch(ARMENIAN_ONLY);
      }
    }
  });

  it("keeps a unique, sequential order from 1 to 40", () => {
    const orders = alphabet.map((entry) => entry.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });

  it("only marks ե, ո and և with a word-initial pronunciation (CLAUDE.md §6-5)", () => {
    const withInitial = alphabet.filter((entry) => entry.ipaWordInitial !== null);
    expect(withInitial.map((entry) => entry.id).sort()).toEqual(["ech", "ev-ligature", "vo"]);
  });

  it("only Ւ (never used standalone) has no tracing strokes", () => {
    const withoutStrokes = alphabet.filter((entry) => entry.lowerStrokes === null);
    expect(withoutStrokes.map((entry) => entry.id)).toEqual(["hyun"]);
    for (const entry of alphabet) {
      if (entry.lowerStrokes === null) continue;
      expect(entry.lowerStrokes.length, entry.id).toBeGreaterThan(0);
      const orders = entry.lowerStrokes.map((s) => s.order);
      expect(orders, entry.id).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1));
    }
  });
});

describe("content/punctuation.json", () => {
  const marks = punctuationSchema.parse(punctuationRaw);

  it("covers the required Armenian-specific punctuation (CLAUDE.md §6-3, §6-4)", () => {
    const symbols = marks.map((m) => m.symbol);
    expect(symbols).toContain("։");
    expect(symbols).toContain("՞");
    expect(symbols).toContain("՜");
  });

  it("marks the question/exclamation/emphasis marks as placed over a vowel, not sentence-final punctuation", () => {
    const overVowel = marks.filter((m) => m.placedOverVowel).map((m) => m.symbol);
    expect(overVowel.sort()).toEqual(["՛", "՜", "՞"]);
    const notOverVowel = marks.filter((m) => !m.placedOverVowel).map((m) => m.symbol);
    expect(notOverVowel.sort()).toEqual(["« »", "՝", "։", "֊"]);
  });
});

describe("content/metro.json", () => {
  const stations = metroSchema.parse(metroRaw);

  it("has 9 main-line stations plus the Charbakh branch (10 total)", () => {
    expect(stations).toHaveLength(10);
    const mainLine = stations.filter((s) => s.branchFromId === null);
    const branch = stations.filter((s) => s.branchFromId !== null);
    expect(mainLine).toHaveLength(9);
    expect(branch).toHaveLength(1);
  });

  it("keeps main-line station names within the Armenian Unicode block", () => {
    for (const station of stations) {
      expect(station.hy, station.id).toMatch(ARMENIAN_ONLY);
    }
  });
});

describe("content/vocab/", () => {
  it("has at least one theme loaded", () => {
    expect(vocab.length).toBeGreaterThan(0);
  });

  it("has unique ids across all theme files", () => {
    const ids = vocab.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not mix look-alike Latin/Cyrillic characters into Armenian-script fields", () => {
    for (const entry of vocab) {
      expect(entry.hy, `${entry.id}.hy`).toMatch(ARMENIAN_SENTENCE);
      expect(entry.example.hy, `${entry.id}.example.hy`).toMatch(ARMENIAN_SENTENCE);
    }
  });

  it("never uses an ASCII period or colon as sentence-final punctuation (CLAUDE.md §6-3: use ։)", () => {
    for (const entry of vocab) {
      for (const [field, value] of [
        ["hy", entry.hy],
        ["example.hy", entry.example.hy],
      ] as const) {
        expect(value.endsWith(".") || value.endsWith(":"), `${entry.id}.${field} "${value}"`).toBe(false);
      }
    }
  });

  it("is all dialect:\"east\" (CLAUDE.md §0: the only supported dialect)", () => {
    for (const entry of vocab) {
      expect(entry.dialect, entry.id).toBe("east");
    }
  });
});

describe("շեշտ (՛, U+055B) の表記方針", () => {
  // 2026-09-03 にユーザーが決定: 肯定の命令形には շեշտ を書かず、否定命令の մի՛ にだけ書く。
  // 辞書は肯定命令にも付けるが (գրի՛ր / կարդա՛)、入力の負担を減らすため付けない側で統一する。
  // punctuation.json だけは շեշտ という記号そのものを教えるデータなので対象外。
  it("only ever appears as part of մի՛ (the prohibitive marker)", () => {
    for (const entry of vocab) {
      for (const [field, value] of [
        ["hy", entry.hy],
        ["example.hy", entry.example.hy],
      ] as const) {
        for (let i = value.indexOf("՛"); i !== -1; i = value.indexOf("՛", i + 1)) {
          expect(value.slice(Math.max(0, i - 2), i).toLowerCase(), `${entry.id}.${field} "${value}"`).toBe("մի");
        }
      }
    }
  });

  it("is documented as the prohibitive convention in punctuation.json", () => {
    const shesht = punctuationSchema.parse(punctuationRaw).find((p) => p.id === "shesht");
    expect(shesht).toBeDefined();
    expect(shesht?.exampleHy).toContain("Մի՛");
  });
});

describe("ruCognate（ロシア語との対応, docs/russian.md §5-1）", () => {
  const withCognate = vocab.filter((v) => v.ruCognate !== null);

  it("is filled in for at least the loanwords the spec names", () => {
    expect(withCognate.length).toBeGreaterThan(0);
    // docs/russian.md が看板例に挙げている մարշրուտկա ← маршрутка。
    const marshrutka = vocab.find((v) => v.id === "v-trans-003");
    expect(marshrutka?.ruCognate?.form).toBe("маршрутка");
  });

  it("writes the Russian form in Cyrillic only, with no stress marks", () => {
    for (const entry of withCognate) {
      expect(entry.ruCognate!.form, `${entry.id}.ruCognate.form`).toMatch(/^[а-яёА-ЯЁ\s-]+$/u);
      // Wiktionary はアクセント記号つきで見出しを出すが、実際の表記には付けない。
      expect(entry.ruCognate!.form.normalize("NFD"), entry.id).not.toMatch(/́/u);
    }
  });

  it("records where the correspondence was checked", () => {
    // CLAUDE.md §7: 推測で埋めない。note に裏取りの出典が入っていること。
    for (const entry of withCognate) {
      expect(entry.ruCognate!.note, `${entry.id}`).toMatch(/Wiktionary/u);
    }
  });

  it("never lets Cyrillic leak into the Armenian fields", () => {
    // 併記してよいのは ruCognate だけ（docs/russian.md §3）。
    for (const entry of vocab) {
      expect(entry.hy, `${entry.id}.hy`).not.toMatch(/[а-яёА-ЯЁ]/u);
      expect(entry.example.hy, `${entry.id}.example.hy`).not.toMatch(/[а-яёА-ЯЁ]/u);
    }
  });
});
