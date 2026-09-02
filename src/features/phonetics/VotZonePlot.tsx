import type { VotJudgement, VotZone } from "../../domain/phonetics/calibration";

export interface VotZonePlotPoint {
  votMs: number;
  judgement: VotJudgement;
}

interface VotZonePlotProps {
  zone: VotZone;
  /** 数直線の表示上限（ms）。これを超える値は右端にクランプして表示する。 */
  maxMs?: number;
  /** 古い順。末尾が最新の1回。 */
  points: VotZonePlotPoint[];
}

const JUDGEMENT_COLOR: Record<VotJudgement, string> = {
  unaspirated: "bg-lapis",
  uncertain: "bg-gold",
  aspirated: "bg-vermillion",
};

function toPercent(votMs: number, maxMs: number): number {
  return Math.min(100, Math.max(0, (votMs / maxMs) * 100));
}

export function VotZonePlot({ zone, maxMs = 150, points }: VotZonePlotProps) {
  const unaspiratedEnd = toPercent(zone.maxUnaspiratedMs, maxMs);
  const aspiratedStart = toPercent(zone.minAspiratedMs, maxMs);
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const history = points.slice(0, -1);

  return (
    <div>
      <div className="relative h-6 w-full rounded-full bg-ink/10">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-lapis/40"
          style={{ width: `${unaspiratedEnd}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-r-full bg-vermillion/40"
          style={{ left: `${aspiratedStart}%`, right: 0 }}
        />

        {history.map((p, i) => (
          <div
            key={i}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 ${JUDGEMENT_COLOR[p.judgement]}`}
            style={{ left: `${toPercent(p.votMs, maxMs)}%` }}
          />
        ))}

        {latest && (
          <div
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink ${JUDGEMENT_COLOR[latest.judgement]}`}
            style={{ left: `${toPercent(latest.votMs, maxMs)}%` }}
            title={`${Math.round(latest.votMs)}ms`}
          />
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink/60">
        <span>0ms</span>
        <span>{zone.maxUnaspiratedMs}ms</span>
        <span>{zone.minAspiratedMs}ms</span>
        <span>{maxMs}ms+</span>
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink/70">
        <span className="text-lapis-text">無気音ゾーン</span>
        <span>どちらとも言えない</span>
        <span className="text-vermillion-text">帯気音ゾーン</span>
      </div>
    </div>
  );
}
