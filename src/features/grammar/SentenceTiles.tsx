import { useMemo, useState } from "react";
import { grammarVerbIrregulars, sentenceTiles } from "../../data/grammar";
import { splitPersonNumber } from "../../domain/grammar/personNumber";
import { composeSentence, shuffleTokens, type SentenceToken } from "../../domain/grammar/sentenceTiles";

const ROLE_CLASS: Record<SentenceToken["role"], string> = {
  lead: "bg-parchment border-gold/30",
  participle: "bg-gold/25 border-gold/50",
  auxiliary: "bg-vermillion/30 border-vermillion/50",
};

function TileRow({ tokens }: { tokens: SentenceToken[] }) {
  return (
    <div lang="hy" className="flex flex-wrap items-baseline gap-1.5 font-serif text-xl">
      {tokens.map((token, i) => (
        <span key={i} className={`rounded-md border px-2 py-1 ${ROLE_CLASS[token.role]}`}>
          {token.text}
        </span>
      ))}
      {tokens.length > 0 && <span>։</span>}
    </div>
  );
}

/**
 * 文タイル (roadmap Phase 5「肯定↔否定で助動詞 եմ が飛ぶ変形を体で覚える」)。
 * 肯定文を見せて、同じ文を否定にして並べ直させる。正解はエンジンが作るので
 * content 側に活用形は無い。docs/interaction.md に従い4択にはしない。
 */
export function SentenceTiles({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);

  const item = sentenceTiles[index];

  const { affirmative, negative, choices } = useMemo(() => {
    const { person, number } = splitPersonNumber(item.personNumber);
    const base = { person, number, tense: item.tense } as const;
    const aff = composeSentence(item.lead, item.lemma, base, grammarVerbIrregulars);
    const neg = composeSentence(
      item.lead,
      item.lemma,
      { ...base, polarity: "negative" },
      grammarVerbIrregulars,
    );
    return { affirmative: aff, negative: neg, choices: shuffleTokens(neg.tokens, index) };
  }, [item, index]);

  const assembled = picked.map((i) => choices[i]);
  const correct =
    checked && assembled.map((t) => t.text).join(" ") === negative.tokens.map((t) => t.text).join(" ");

  function next() {
    setIndex((i) => (i + 1) % sentenceTiles.length);
    setPicked([]);
    setChecked(false);
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>

        <h1 className="font-serif text-3xl font-bold">文タイル</h1>
        <p className="mt-1 text-sm text-ink/70">
          肯定の文を否定に組み替える。助動詞（朱のタイル）がどこへ動くかを手で確かめる。
        </p>
        <p className="mt-3 text-xs text-ink/50">
          {index + 1} / {sentenceTiles.length}
        </p>

        <section className="mt-4 rounded-lg border border-gold/40 bg-parchment-light p-4">
          <h2 className="text-xs uppercase tracking-widest text-ink/50">元の文（肯定）</h2>
          <div className="mt-2" aria-label="元の文">
            <TileRow tokens={affirmative.tokens} />
          </div>
          <p className="mt-2 text-sm text-ink/70">{item.ja_affirmative}</p>
        </section>

        <section className="mt-4 rounded-lg border border-gold/40 bg-parchment-light p-4">
          <h2 className="text-xs uppercase tracking-widest text-ink/50">これを否定にする</h2>
          <p className="mt-1 text-sm text-ink/70">{item.ja_negative}</p>

          <div
            aria-label="組み立て中の文"
            className="mt-3 min-h-12 rounded border border-gold/40 bg-parchment px-2 py-2"
          >
            {assembled.length > 0 ? (
              <TileRow tokens={assembled} />
            ) : (
              <span className="font-serif text-xl text-ink/30">…</span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {choices.map((token, i) => (
              <button
                key={i}
                type="button"
                lang="hy"
                disabled={checked || picked.includes(i)}
                onClick={() => setPicked((p) => [...p, i])}
                className={`rounded-md border px-3 py-1.5 font-serif text-lg transition hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-25 ${ROLE_CLASS[token.role]}`}
              >
                {token.text}
              </button>
            ))}
          </div>

          {picked.length > 0 && !checked && (
            <button type="button" onClick={() => setPicked([])} className="mt-2 text-xs text-ink/60 underline">
              並べ直す
            </button>
          )}

          {!checked ? (
            <button
              type="button"
              onClick={() => setChecked(true)}
              disabled={picked.length !== choices.length}
              className="mt-3 w-full rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              確認する
            </button>
          ) : (
            <div className="mt-3 text-sm">
              <p className={correct ? "text-gold" : "text-vermillion"}>{correct ? "正解です。" : "不正解です。"}</p>
              <div className="mt-2" aria-label="正解の文">
                <TileRow tokens={negative.tokens} />
              </div>
              <p className="mt-2 text-ink/80">
                {negative.auxiliaryFirst
                  ? "否定では助動詞が分詞の前に飛ぶ（L07）。分詞は文末に回る。"
                  : "繋辞なので、否定にしても位置は変わらない。飛ぶのは動詞の助動詞だけ。"}
              </p>
              {item.notes_ja && <p className="mt-1 text-xs text-ink/60">{item.notes_ja}</p>}
              <button
                type="button"
                onClick={next}
                className="mt-3 w-full rounded-md border border-gold bg-parchment px-4 py-2 text-sm text-ink hover:bg-parchment-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                次の文へ
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
