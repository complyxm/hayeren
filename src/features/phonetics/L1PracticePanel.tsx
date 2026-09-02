import type { AlphabetLetter } from "../../data/schemas/alphabet";
import { transcriptContainsTarget } from "../../domain/phonetics/transcriptMatch";

interface L1PracticePanelProps {
  letters: AlphabetLetter[];
  letterId: string;
  onLetterChange: (id: string) => void;
  listening: boolean;
  onListen: () => void;
  error: string | null;
  alternatives: string[] | null;
}

export function L1PracticePanel({
  letters,
  letterId,
  onLetterChange,
  listening,
  onListen,
  error,
  alternatives,
}: L1PracticePanelProps) {
  const letter = letters.find((l) => l.id === letterId) ?? letters[0];
  const matched = alternatives ? transcriptContainsTarget(alternatives, letter.nameTranslit) : null;

  return (
    <div className="rounded-lg border border-gold/30 bg-parchment-light p-5">
      <label className="mb-4 block text-sm">
        文字
        <select
          value={letterId}
          onChange={(e) => onLetterChange(e.target.value)}
          disabled={listening}
          className="ml-2 rounded border border-gold/40 bg-parchment px-2 py-1 text-ink"
        >
          {letters.map((l) => (
            <option key={l.id} value={l.id}>
              {l.upper}/{l.lower} （{l.name}）
            </option>
          ))}
        </select>
      </label>

      <p className="mb-4 text-lg">
        <span lang="hy" className="font-serif">
          Ասա՛ «{letter.name}»։
        </span>
        <span className="ml-2 text-sm text-ink/60">（「{letter.name}」と言ってください）</span>
      </p>

      <button
        type="button"
        onClick={onListen}
        disabled={listening}
        className="rounded-md border border-gold bg-vermillion/80 px-4 py-2 text-sm text-ink disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      >
        {listening ? "聞いています…" : "認識する"}
      </button>

      {error && <p className="mt-4 text-sm text-vermillion-text">{error}</p>}

      {alternatives && !error && (
        <div className="mt-4 text-sm">
          <p className={matched ? "text-gold" : "text-ink/70"}>
            {matched
              ? "候補の中に一致するものがありました。"
              : "候補の中に一致するものは見つかりませんでした（hy-AM の認識精度には限界があります）。"}
          </p>
          <p className="mt-2 text-ink/60">認識結果（参考・ラテン翻字で返ります）:</p>
          <ul className="ml-4 list-disc">
            {alternatives.map((alt, i) => (
              <li key={i}>{alt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
