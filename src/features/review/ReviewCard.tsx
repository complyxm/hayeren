import type { AlphabetLetter } from "../../data/schemas/alphabet";
import type { ReviewRating } from "../../domain/srs/types";
import { Transliteration } from "../settings/transliteration";

interface ReviewCardProps {
  letter: AlphabetLetter;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (rating: ReviewRating) => void;
}

const GRADE_BUTTONS: { rating: ReviewRating; label: string }[] = [
  { rating: 1, label: "もう一度" },
  { rating: 2, label: "難しい" },
  { rating: 3, label: "普通" },
  { rating: 4, label: "簡単" },
];

export function ReviewCard({ letter, revealed, onReveal, onGrade }: ReviewCardProps) {
  const verifiedWord = letter.exampleWords.find((w) => w.status === "verified");

  return (
    <div className="mt-6 rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
      <p lang="hy" className="font-serif text-8xl leading-none text-ink">
        {letter.upper}
        {letter.lower}
      </p>

      {!revealed && (
        <button
          type="button"
          onClick={onReveal}
          className="mt-6 rounded-md border border-gold bg-gold/20 px-5 py-2 text-sm hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          裏を見る
        </button>
      )}

      {revealed && (
        <>
          <p lang="hy" className="mt-4 font-serif text-2xl text-gold">
            {letter.name}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            <Transliteration text={`${letter.nameTranslit} ／ 転写 ${letter.translit} ／ `} />
            IPA {letter.ipa}
            {letter.ipaWordInitial ? `（語頭 ${letter.ipaWordInitial}）` : ""}
          </p>
          {verifiedWord && (
            <p className="mt-3 text-sm text-ink/80">
              <span lang="hy" className="font-serif text-lg">
                {verifiedWord.hy}
              </span>
              <Transliteration text={verifiedWord.translit} className="ml-2 text-ink/60" />
              <span className="ml-2">— {verifiedWord.ja}</span>
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADE_BUTTONS.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                onClick={() => onGrade(rating)}
                className="rounded-md border border-gold/40 px-3 py-2 text-sm hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
