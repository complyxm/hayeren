import {
  VOICED_ZONE,
  type AttemptedSeries,
  type ThreeWayJudgement,
  type VotZone,
} from "../../domain/phonetics/calibration";

export interface VotZonePlotPoint {
  votMs: number;
  judgement: ThreeWayJudgement;
}

interface VotZonePlotProps {
  zone: VotZone;
  /** 数直線の表示上限（ms）。これを超える値は右端にクランプして表示する。 */
  maxMs?: number;
  /** 古い順。末尾が最新の1回。 */
  points: VotZonePlotPoint[];
  /** 凡例に出す三つ組の字（例: բ / պ / փ）。 */
  letters: Record<AttemptedSeries, string>;
}

// 息の量が増える向き（左→右）に、冷たい色から熱い色へ並べる。
// 判定を保留したときだけ顔料を使わない（灰色＝色が付かなかった、の意）。
const JUDGEMENT_COLOR: Record<ThreeWayJudgement, string> = {
  voiced: "bg-lapis",
  unaspirated: "bg-gold",
  aspirated: "bg-vermillion",
  uncertain: "bg-ink/50",
};

const LEGEND: { series: AttemptedSeries; swatch: string; text: string; name: string }[] = [
  { series: "voiced", swatch: "bg-lapis", text: "text-lapis-text", name: "有声" },
  { series: "unaspirated", swatch: "bg-gold", text: "text-gold", name: "無気無声" },
  { series: "aspirated", swatch: "bg-vermillion", text: "text-vermillion-text", name: "帯気無声" },
];

function toPercent(votMs: number, maxMs: number): number {
  return Math.min(100, Math.max(0, (votMs / maxMs) * 100));
}

export function VotZonePlot({ zone, maxMs = 150, points, letters }: VotZonePlotProps) {
  const voicedEnd = toPercent(VOICED_ZONE.maxVotMs, maxMs);
  const unaspiratedEnd = toPercent(zone.maxUnaspiratedMs, maxMs);
  const aspiratedStart = toPercent(zone.minAspiratedMs, maxMs);
  const latest = points.length > 0 ? points[points.length - 1] : null;
  const history = points.slice(0, -1);

  const range: Record<AttemptedSeries, string> = {
    voiced: `0〜${VOICED_ZONE.maxVotMs}ms ＋ 閉鎖のあいだの声`,
    unaspirated: `${VOICED_ZONE.maxVotMs}〜${zone.maxUnaspiratedMs}ms`,
    aspirated: `${zone.minAspiratedMs}ms 以上`,
  };

  return (
    <div>
      <div className="relative h-6 w-full rounded-full bg-ink/10">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-lapis/50"
          style={{ width: `${voicedEnd}%` }}
        />
        <div
          className="absolute inset-y-0 bg-gold/30"
          style={{ left: `${voicedEnd}%`, width: `${Math.max(0, unaspiratedEnd - voicedEnd)}%` }}
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
        <span>破裂から声が出るまでの時間</span>
        <span>{maxMs}ms+</span>
      </div>

      <ul className="mt-3 space-y-1 text-xs">
        {LEGEND.map((row) => (
          <li key={row.series} className="flex items-center gap-2">
            <span className={`h-2 w-4 shrink-0 rounded-sm ${row.swatch}`} aria-hidden="true" />
            <span lang="hy" className="font-serif text-base">
              {letters[row.series]}
            </span>
            <span className={row.text}>{row.name}</span>
            <span className="text-ink/60">{range[row.series]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="h-2 w-4 shrink-0 rounded-sm bg-ink/50" aria-hidden="true" />
          <span className="text-ink/70">どちらとも言えない</span>
        </li>
      </ul>
      <p className="mt-2 text-xs text-ink/60">
        いちばん左のゾーンは時間だけでは決まりません。口を閉じているあいだも声が続いていて初めて有声と判定します。
      </p>
    </div>
  );
}
