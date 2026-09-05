import type { AlphabetLetter } from "../../data/schemas/alphabet";
import { PLOSIVE_TRIADS } from "../../domain/phonetics/plosiveTriads";
import type { AttemptedSeries, PlosivePlace } from "../../domain/phonetics/calibration";

const PLACE_LABEL: Record<PlosivePlace, string> = {
  labial: "唇の音（բ / պ / փ）",
  dental: "歯の音（դ / տ / թ）",
  velar: "のどの奥の音（գ / կ / ք）",
};

const SERIES_ORDER: AttemptedSeries[] = ["voiced", "unaspirated", "aspirated"];

const SERIES_HINT: Record<AttemptedSeries, string> = {
  voiced: "閉じているうちから声",
  unaspirated: "息なし",
  aspirated: "息を強く",
};

interface VotTargetSelectorProps {
  place: PlosivePlace;
  onPlaceChange: (place: PlosivePlace) => void;
  attempted: AttemptedSeries;
  onAttemptedChange: (target: AttemptedSeries) => void;
  /** 三つ組の字。順は SERIES_ORDER と同じ（有声 → 無気無声 → 帯気無声）。 */
  letters: Record<AttemptedSeries, AlphabetLetter>;
}

export function VotTargetSelector({
  place,
  onPlaceChange,
  attempted,
  onAttemptedChange,
  letters,
}: VotTargetSelectorProps) {
  return (
    <>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm text-ink/70">対象</legend>
        <div className="flex flex-wrap gap-2">
          {PLOSIVE_TRIADS.map((t) => (
            <button
              key={t.place}
              type="button"
              onClick={() => onPlaceChange(t.place)}
              className={`rounded-md border px-3 py-2 text-sm ${
                place === t.place ? "border-gold bg-gold/20" : "border-gold/30 hover:border-gold"
              }`}
            >
              {PLACE_LABEL[t.place]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm text-ink/70">どれを言いますか</legend>
        <div className="flex gap-2">
          {SERIES_ORDER.map((series) => {
            const letter = letters[series];
            return (
              <label
                key={series}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-3 ${
                  attempted === series ? "border-gold bg-gold/20" : "border-gold/30"
                }`}
              >
                <input
                  type="radio"
                  name="attempted"
                  checked={attempted === series}
                  onChange={() => onAttemptedChange(series)}
                />
                <span lang="hy" className="font-serif text-3xl">
                  {letter.lower}
                </span>
                <span className="text-xs text-ink/60">{letter.translit}</span>
                <span className="text-center text-[11px] text-ink/60">{SERIES_HINT[series]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
