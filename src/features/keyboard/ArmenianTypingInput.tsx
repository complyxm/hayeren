import { useMemo, useState } from "react";
import { alphabet } from "../../data/alphabet";
import { punctuationMarks } from "../../data/punctuation";
import { buildKeyboardLayout } from "../../domain/translit/keyboardLayout";
import type { AlphabetLetter } from "../../data/schemas/alphabet";

interface ArmenianTypingInputProps {
  value: string;
  onChange: (text: string) => void;
  disabled?: boolean;
}

/**
 * 読点「,」は content/punctuation.json に無い（アルメニア語固有の記号ではなく
 * ラテンと共通のため。「,」と紛らわしい「՝」は別の機能を持つ記号で、
 * 通常の読点の代用ではない — 2026-08-29 に実測・調査済み）。
 * ここでは punctuation.json の記号一式に読点とスペースを加えたものを、
 * 語句をまるごと打たせるための入力として提供する。
 */
function usePunctuationKeys(): { symbol: string; title: string }[] {
  return useMemo(
    () => [
      ...punctuationMarks.map((mark) => ({ symbol: mark.symbol, title: `${mark.nameTranslit} (${mark.name})` })),
      { symbol: ",", title: "読点" },
    ],
    [],
  );
}

function KeyButton({
  letter,
  caseMode,
  disabled,
  onPress,
}: {
  letter: AlphabetLetter;
  caseMode: "lower" | "upper";
  disabled: boolean;
  onPress: (char: string) => void;
}) {
  // Aa は「次の1字を大文字にする」ためのトグルであり、この文脈で必要なのは
  // digraph/ligature の語頭表記（Ու/Եվ）であって、全体を大文字化するブロック体
  // 表記（ՈՒ/ԵՎ、letter.upper）ではない。両者は綴りが異なるため区別が必要。
  const glyph = caseMode === "upper" ? (letter.titleCase ?? letter.upper) : letter.lower;
  return (
    <button
      type="button"
      lang="hy"
      disabled={disabled}
      onClick={() => onPress(glyph)}
      className="flex h-10 w-8 shrink-0 flex-col items-center justify-center rounded-md border border-gold/30 bg-parchment-light font-serif text-base leading-none hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 sm:h-11 sm:w-10 sm:text-lg"
      title={`${letter.translit} (${letter.name})`}
    >
      {glyph}
    </button>
  );
}

/**
 * ArmenianKeyboard(画面内キーボードの練習画面)と、語彙の ja→hy 想起カードの
 * どちらからも使う、アルメニア語の画面内タイピング部品。CLAUDE.md §6-7
 * 「学習の主軸は常にアルメニア文字」— 4択ではなく実際に打たせるための入力手段。
 */
export function ArmenianTypingInput({ value, onChange, disabled = false }: ArmenianTypingInputProps) {
  const [caseMode, setCaseMode] = useState<"lower" | "upper">("lower");
  const layout = useMemo(() => buildKeyboardLayout(alphabet), []);
  const punctuationKeys = usePunctuationKeys();

  return (
    <div>
      <div
        lang="hy"
        className="mb-2 min-h-14 rounded-lg border border-gold/40 bg-parchment-light p-3 font-serif text-3xl"
        aria-label="入力欄"
      >
        {value || <span className="text-ink/30">ここに表示されます</span>}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCaseMode((m) => (m === "lower" ? "upper" : "lower"))}
          aria-pressed={caseMode === "upper"}
          className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          Aa（{caseMode === "upper" ? "大文字" : "小文字"}）
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(`${value} `)}
          className="rounded-md border border-gold/40 px-4 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          ␣ スペース
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(value.slice(0, -1))}
          className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          ⌫ 削除
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange("")}
          className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50"
        >
          クリア
        </button>
      </div>

      <div className="space-y-1 overflow-x-auto pb-1">
        {layout.rows.map((row, i) => (
          <div key={i} className="flex w-max min-w-full justify-center gap-1">
            {row.map((letter, j) =>
              letter ? (
                <KeyButton
                  key={letter.id}
                  letter={letter}
                  caseMode={caseMode}
                  disabled={disabled}
                  onPress={(c) => onChange(value + c)}
                />
              ) : (
                <span key={j} className="w-8 shrink-0 sm:w-10" aria-hidden="true" />
              ),
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold tracking-wide text-ink/70">その他の文字</h2>
      <div className="flex flex-wrap justify-center gap-1">
        {layout.extras.map((letter) => (
          <KeyButton
            key={letter.id}
            letter={letter}
            caseMode={caseMode}
            disabled={disabled}
            onPress={(c) => onChange(value + c)}
          />
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold tracking-wide text-ink/70">句読点</h2>
      <div className="flex flex-wrap justify-center gap-1">
        {punctuationKeys.map(({ symbol, title }) => (
          <button
            key={symbol}
            type="button"
            lang="hy"
            disabled={disabled}
            onClick={() => onChange(value + symbol)}
            title={title}
            className="flex h-10 min-w-8 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-parchment-light px-2 font-serif text-base leading-none hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 sm:h-11 sm:text-lg"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
