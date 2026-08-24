import type { AlphabetLetter } from "../../data/schemas/alphabet";

/**
 * 画面内アルメニア語キーボードの配列（curriculum.md §1.5「音声配列」）。
 *
 * 各文字の transliteration が「アクセント記号なしの1文字」であるものだけを
 * ラテン QWERTY の対応キーに割り当てる（例: "a" → Ա, "p" → Պ）。
 * 有気音・記号付きの転写を持つ文字（"t'", "š" など）は該当キーに
 * 収まらないため「その他の文字」にまとめる。この規則により、
 * どの文字をどのキーに置くかを恣意的に決めずアルファベットデータから
 * 機械的に導出できる。
 *
 * Ւ（hyun）は改革正書法で単独では使われない（CLAUDE.md §6-6）ため、
 * 単独で打てる文字としては扱わない。exampleWords が0件であることを
 * その判定に使う（他の文字は最低1件の例語を持つ）。
 */

const QWERTY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"].map((row) => row.split(""));

export interface KeyboardLayout {
  rows: (AlphabetLetter | null)[][];
  extras: AlphabetLetter[];
}

function isStandaloneTypable(letter: AlphabetLetter): boolean {
  return letter.exampleWords.length > 0;
}

function isPlainSingleLatinLetter(translit: string): boolean {
  return /^[a-z]$/.test(translit);
}

export function buildKeyboardLayout(alphabet: AlphabetLetter[]): KeyboardLayout {
  const typable = alphabet.filter(isStandaloneTypable);

  const primaryByKey = new Map<string, AlphabetLetter>();
  for (const letter of typable) {
    if (isPlainSingleLatinLetter(letter.translit)) {
      primaryByKey.set(letter.translit, letter);
    }
  }

  const rows = QWERTY_ROWS.map((row) => row.map((key) => primaryByKey.get(key) ?? null));

  const assignedIds = new Set([...primaryByKey.values()].map((letter) => letter.id));
  const extras = typable
    .filter((letter) => !assignedIds.has(letter.id))
    .sort((a, b) => a.order - b.order);

  return { rows, extras };
}
