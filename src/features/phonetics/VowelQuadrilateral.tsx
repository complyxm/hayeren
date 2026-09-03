import type { VowelPlotPoint } from "../../domain/phonetics/vowelSpace";

export interface VowelQuadrilateralProps {
  points: VowelPlotPoint[];
  /** 点に添える文字（母音 id → アルメニア文字）。 */
  labelOf: (vowelId: string) => string;
  /** 位置関係が崩れている母音の id。目立たせる。 */
  problemIds: string[];
}

const PAD = 14;

/**
 * 母音四辺形。横軸は舌の前後（右が前）、縦軸は口の開き（下が開）。
 * 座標は**学習者自身の測定値で正規化**した 0〜1（vowelSpace.normalizeVowelSpace）。
 * 目標の楕円は描かない — 絶対的な目標 Hz を持たない設計だから（vowelSpace.ts 参照）。
 */
export function VowelQuadrilateral({ points, labelOf, problemIds }: VowelQuadrilateralProps) {
  const problems = new Set(problemIds);

  return (
    <figure className="mt-4">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="母音の位置の図。横は舌の前後、縦は口の開き。"
        className="w-full rounded-lg border border-gold/30 bg-parchment-light"
      >
        <line x1={PAD} y1={PAD} x2={PAD} y2={100 - PAD} stroke="currentColor" strokeWidth="0.4" opacity="0.3" />
        <line
          x1={PAD}
          y1={100 - PAD}
          x2={100 - PAD}
          y2={100 - PAD}
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.3"
        />

        {points.map((p) => {
          // x: 0（後舌）〜1（前舌）を左→右に。y: 0（閉）〜1（開）を上→下に。
          const cx = PAD + p.x * (100 - PAD * 2);
          const cy = PAD + p.y * (100 - PAD * 2);
          const isProblem = problems.has(p.id);
          return (
            <g key={p.id}>
              <circle
                cx={cx}
                cy={cy}
                r={isProblem ? 4 : 3}
                className={isProblem ? "fill-vermillion" : "fill-lapis"}
              />
              <text
                x={cx}
                y={cy - 5}
                textAnchor="middle"
                lang="hy"
                fontSize="7"
                className="fill-current font-serif"
              >
                {labelOf(p.id)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-ink/60">
        <span>← 舌が後ろ</span>
        <span>口が開く ↓</span>
        <span>舌が前 →</span>
      </figcaption>
    </figure>
  );
}
