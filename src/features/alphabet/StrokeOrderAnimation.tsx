import { useEffect, useRef, useState } from "react";
import type { Stroke } from "../../data/schemas/alphabet";
import { STROKE_VIEW_BOX } from "./strokeViewBox";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface StrokeOrderAnimationProps {
  strokes: Stroke[];
}

const STEP_MS = 550;
const GAP_MS = 200;

function AnimatedStroke({ d, revealed, reducedMotion }: { d: string; revealed: boolean; reducedMotion: boolean }) {
  const ref = useRef<SVGPathElement>(null);
  const [length, setLength] = useState(0);

  useEffect(() => {
    if (ref.current) setLength(ref.current.getTotalLength());
  }, [d]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke="#c9a227"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity: revealed || reducedMotion ? 1 : 0,
        strokeDasharray: length || undefined,
        strokeDashoffset: reducedMotion ? 0 : revealed ? 0 : length,
        transition: reducedMotion ? "none" : `stroke-dashoffset ${STEP_MS}ms ease, opacity 60ms`,
      }}
    />
  );
}

export function StrokeOrderAnimation({ strokes }: StrokeOrderAnimationProps) {
  const reducedMotion = usePrefersReducedMotion();
  // playToken ごとに親がこのコンポーネントを key で再マウントするため、
  // 初期値の計算だけで「最初から再生」が成立する（エフェクト内でのリセット不要）。
  const [revealedCount, setRevealedCount] = useState(() => (reducedMotion ? strokes.length : 0));

  useEffect(() => {
    if (reducedMotion) return;
    const timers = strokes.map((_, i) =>
      setTimeout(() => setRevealedCount((c) => Math.max(c, i + 1)), i * (STEP_MS + GAP_MS) + 120),
    );
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion, strokes]);

  const ordered = [...strokes].sort((a, b) => a.order - b.order);

  return (
    <svg viewBox={STROKE_VIEW_BOX} className="mx-auto h-40 w-auto" aria-hidden="true">
      {ordered.map((stroke, i) => (
        <AnimatedStroke key={stroke.order} d={stroke.d} revealed={i < revealedCount} reducedMotion={reducedMotion} />
      ))}
    </svg>
  );
}
