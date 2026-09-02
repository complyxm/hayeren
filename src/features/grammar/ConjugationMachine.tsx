import { useMemo, useState } from "react";
import { conjugableVerbs, grammarVerbIrregulars } from "../../data/grammar";
import type { PersonNumber, Polarity, Tense } from "../../data/schemas/grammar";
import { conjugate } from "../../domain/grammar/conjugate";
import { splitPersonNumber } from "../../domain/grammar/personNumber";
import type { ConjugationResult } from "../../domain/grammar/types";

const TENSES: { key: Tense; label: string; lesson: string }[] = [
  { key: "present", label: "現在", lesson: "L06" },
  { key: "imperfect", label: "過去進行", lesson: "L17" },
  { key: "aorist", label: "アオリスト", lesson: "L18" },
  { key: "future", label: "未来", lesson: "L19" },
  { key: "subjunctive", label: "接続法", lesson: "L22" },
  { key: "conditional", label: "条件法", lesson: "L24" },
];

const PERSON_NUMBERS: { key: PersonNumber; label: string }[] = [
  { key: "1sg", label: "私" },
  { key: "2sg", label: "君" },
  { key: "3sg", label: "彼・彼女" },
  { key: "1pl", label: "私たち" },
  { key: "2pl", label: "あなたたち" },
  { key: "3pl", label: "彼ら" },
];

/** ダイヤル1つ分。選択中は金の枠で示す（色だけに頼らず太字も変える）。 */
function Dial<T extends string>({
  legend,
  options,
  value,
  onChange,
  columns,
}: {
  legend: string;
  options: { key: T; label: string; hint?: string }[];
  value: T;
  onChange: (next: T) => void;
  columns: string;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-xs uppercase tracking-widest text-ink/60">{legend}</legend>
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.key)}
              className={`rounded-md border px-2 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                selected
                  ? "border-gold bg-gold/20 font-bold text-ink"
                  : "border-gold/30 bg-parchment-light text-ink/70 hover:border-gold/60"
              }`}
            >
              {option.label}
              {option.hint && <span className="block text-[10px] text-ink/60">{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * 活用マシン (roadmap Phase 5)。ダイヤルを回すと形が即座に変わる**正誤判定のない探索画面**。
 * 分詞と助動詞を別のタイルで見せ、否定にすると助動詞が前に飛ぶ (L07) のを目で追えるようにする。
 * エンジンが形を保証できない組み合わせ (例: -նել 動詞のアオリスト) は、
 * それらしい形を作らずに理由を出す — CLAUDE.md §7「推測で埋めない」。
 */
export function ConjugationMachine({ onBack }: { onBack: () => void }) {
  const [lemma, setLemma] = useState(conjugableVerbs[0]?.lemma ?? "գրել");
  const [tense, setTense] = useState<Tense>("present");
  const [personNumber, setPersonNumber] = useState<PersonNumber>("1sg");
  const [polarity, setPolarity] = useState<Polarity>("affirmative");

  const outcome = useMemo((): { result: ConjugationResult } | { error: string } => {
    const { person, number } = splitPersonNumber(personNumber);
    try {
      return { result: conjugate(lemma, { person, number, tense, polarity }, grammarVerbIrregulars) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [lemma, tense, personNumber, polarity]);

  const verb = conjugableVerbs.find((v) => v.lemma === lemma);
  const result = "result" in outcome ? outcome.result : null;
  // 総合形 (アオリスト・接続法・条件法の肯定・補充法) は分詞を持たない = 1語で完結する。
  const synthetic = result !== null && result.participle === null;

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

        <h1 className="font-serif text-3xl font-bold">活用マシン</h1>
        <p className="mt-1 text-sm text-ink/70">
          ダイヤルを回して形の変わり方を眺める画面。採点はしない。否定にすると助動詞がどう動くかを見る。
        </p>

        <div className="mt-6 rounded-lg border border-gold/40 bg-parchment-light p-4">
          <div lang="hy" className="min-h-16 font-serif text-3xl">
            {result ? (
              <div className="flex flex-wrap items-baseline gap-2">
                {synthetic ? (
                  <span className="rounded-md bg-gold/25 px-3 py-1">{result.form}</span>
                ) : result.auxiliaryFirst ? (
                  <>
                    <span className="rounded-md bg-vermillion/30 px-3 py-1">{result.auxiliary}</span>
                    <span className="rounded-md bg-gold/25 px-3 py-1">{result.participle}</span>
                  </>
                ) : (
                  <>
                    <span className="rounded-md bg-gold/25 px-3 py-1">{result.participle}</span>
                    <span className="rounded-md bg-vermillion/30 px-3 py-1">{result.auxiliary}</span>
                  </>
                )}
              </div>
            ) : (
              <p className="font-sans text-sm text-ink/60">
                この組み合わせの形は辞書に無いので出しません。推測した形を見せるより、出さないほうが安全です。
                <span className="mt-2 block text-xs text-ink/60">
                  {"error" in outcome ? outcome.error : ""}
                </span>
              </p>
            )}
          </div>

          {result && !synthetic && (
            <p className="mt-3 text-xs text-ink/60">
              <span className="rounded bg-gold/25 px-1">金</span>＝
              {tense === "future" ? "不定詞 + ու" : "分詞"} ／{" "}
              <span className="rounded bg-vermillion/30 px-1">朱</span>＝助動詞。
              {result.auxiliaryFirst ? "否定では助動詞が前に出る（L07）。" : "肯定では助動詞が後ろ。"}
            </p>
          )}
          {result && synthetic && (
            <p className="mt-3 text-xs text-ink/60">助動詞を使わない1語の形。語尾そのものが人称を示す。</p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs uppercase tracking-widest text-ink/60">動詞</legend>
          <select
            value={lemma}
            onChange={(e) => setLemma(e.target.value)}
            lang="hy"
            className="mt-2 w-full rounded-md border border-gold/40 bg-parchment-light px-3 py-2 font-serif text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            {conjugableVerbs.map((v) => (
              <option key={v.vocabId} value={v.lemma}>
                {v.lemma}（{v.ja}）
              </option>
            ))}
          </select>
          {verb && <p className="mt-1 text-xs text-ink/60">語彙 {verb.vocabId} から</p>}
        </fieldset>

        <Dial
          legend="時制・法"
          columns="grid-cols-3"
          value={tense}
          onChange={setTense}
          options={TENSES.map((t) => ({ key: t.key, label: t.label, hint: t.lesson }))}
        />

        <Dial
          legend="人称・数"
          columns="grid-cols-3"
          value={personNumber}
          onChange={setPersonNumber}
          options={PERSON_NUMBERS}
        />

        <Dial
          legend="肯定・否定"
          columns="grid-cols-2"
          value={polarity}
          onChange={setPolarity}
          options={[
            { key: "affirmative", label: "肯定" },
            { key: "negative", label: "否定" },
          ]}
        />
      </div>
    </main>
  );
}
