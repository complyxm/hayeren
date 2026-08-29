import type { AlphabetLetter } from "../../data/schemas/alphabet";
import { PLOSIVE_PAIRS } from "../../domain/phonetics/plosivePairs";
import type { PlosivePlace } from "../../domain/phonetics/calibration";
import type { AttemptedTarget } from "./votFeedback";

const PLACE_LABEL: Record<PlosivePlace, string> = {
  labial: "唇音（պ / փ）",
  dental: "歯音（տ / թ）",
  velar: "軟口蓋音（կ / ք）",
};

interface VotTargetSelectorProps {
  place: PlosivePlace;
  onPlaceChange: (place: PlosivePlace) => void;
  attempted: AttemptedTarget;
  onAttemptedChange: (target: AttemptedTarget) => void;
  unaspiratedLetter: AlphabetLetter;
  aspiratedLetter: AlphabetLetter;
}

export function VotTargetSelector({
  place,
  onPlaceChange,
  attempted,
  onAttemptedChange,
  unaspiratedLetter,
  aspiratedLetter,
}: VotTargetSelectorProps) {
  return (
    <>
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm text-ink/70">対象</legend>
        <div className="flex flex-wrap gap-2">
          {PLOSIVE_PAIRS.map((p) => (
            <button
              key={p.place}
              type="button"
              onClick={() => onPlaceChange(p.place)}
              className={`rounded-md border px-3 py-2 text-sm ${
                place === p.place ? "border-gold bg-gold/20" : "border-gold/30 hover:border-gold"
              }`}
            >
              {PLACE_LABEL[p.place]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm text-ink/70">どちらを言いますか</legend>
        <div className="flex gap-2">
          {(["unaspirated", "aspirated"] as const).map((target) => {
            const letter = target === "unaspirated" ? unaspiratedLetter : aspiratedLetter;
            return (
              <label
                key={target}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 ${
                  attempted === target ? "border-gold bg-gold/20" : "border-gold/30"
                }`}
              >
                <input
                  type="radio"
                  name="attempted"
                  checked={attempted === target}
                  onChange={() => onAttemptedChange(target)}
                />
                <span lang="hy" className="font-serif text-3xl">
                  {letter.lower}
                </span>
                <span className="text-xs text-ink/60">{letter.translit}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
