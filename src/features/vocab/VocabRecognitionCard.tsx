import type { VocabEntry } from "../../data/schemas/vocab";
import type { ReviewRating } from "../../domain/srs/types";
import { Transliteration } from "../settings/transliteration";

interface VocabRecognitionCardProps {
  entry: VocabEntry;
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

/**
 * hy→ja(再認)カード。curriculum.md §5「hy → ja は機械採点しない。本人が
 * 4段階で自己評価する」。
 */
export function VocabRecognitionCard({ entry, revealed, onReveal, onGrade }: VocabRecognitionCardProps) {
  return (
    <div className="mt-6 rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
      <p lang="hy" className="font-serif text-4xl leading-snug text-ink">
        {entry.hy}
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
          <p className="mt-4 text-2xl text-gold">{entry.ja.join("、")}</p>
          <Transliteration text={entry.translit} className="mt-1 block text-sm text-ink/70" />
          <p lang="hy" className="mt-3 text-sm text-ink/80">
            {entry.example.hy}
            <span lang="ja" className="ml-2 text-ink/60">
              {entry.example.ja}
            </span>
          </p>

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
