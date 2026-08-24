import { useMemo, useRef, useState } from "react";
import type { Stroke } from "../../data/schemas/alphabet";
import {
  COMPLETION_THRESHOLD,
  evaluateTracePoint,
  parseLinePath,
  type Point,
} from "../../domain/translit/strokePath";
import { STROKE_VIEW_BOX, STROKE_VIEW_BOX_H, STROKE_VIEW_BOX_W } from "./strokeViewBox";

interface TracingPracticeProps {
  strokes: Stroke[];
  onComplete: () => void;
}

// なぞりの許容誤差。CLAUDE.md §10: 較正前の数値の決め打ちを避けるとあるため、
// 将来は設定画面から調整できるようにする前提の暫定値。
const TOLERANCE_UNITS = 9;

function toSvgPoint(evt: { clientX: number; clientY: number }, svg: SVGSVGElement): Point {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((evt.clientX - rect.left) / rect.width) * STROKE_VIEW_BOX_W,
    y: ((evt.clientY - rect.top) / rect.height) * STROKE_VIEW_BOX_H,
  };
}

function trailToD(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

function PointerTracer({ strokes, onComplete }: TracingPracticeProps) {
  const ordered = useMemo(() => [...strokes].sort((a, b) => a.order - b.order), [strokes]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [trail, setTrail] = useState<Point[]>([]);
  const [status, setStatus] = useState<"idle" | "dragging" | "error">("idle");
  const maxProgressRef = useRef(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const done = strokeIndex >= ordered.length;
  const target = done ? null : parseLinePath(ordered[strokeIndex].d);

  function reset() {
    setTrail([]);
    setStatus("idle");
    maxProgressRef.current = 0;
  }

  function handlePointerDown(evt: React.PointerEvent<SVGSVGElement>) {
    if (done || !target) return;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    const pt = toSvgPoint(evt, evt.currentTarget);
    maxProgressRef.current = 0;
    setTrail([pt]);
    setStatus("dragging");
  }

  function handlePointerMove(evt: React.PointerEvent<SVGSVGElement>) {
    if (status !== "dragging" || !target) return;
    const pt = toSvgPoint(evt, evt.currentTarget);
    const result = evaluateTracePoint(pt, target, TOLERANCE_UNITS);
    if (!result.onPath) {
      setStatus("error");
      return;
    }
    maxProgressRef.current = Math.max(maxProgressRef.current, result.progress);
    setTrail((t) => [...t, pt]);
  }

  function handlePointerUp() {
    if (status === "dragging" && maxProgressRef.current >= COMPLETION_THRESHOLD) {
      const next = strokeIndex + 1;
      reset();
      if (next >= ordered.length) {
        onComplete();
      }
      setStrokeIndex(next);
      return;
    }
    reset();
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={STROKE_VIEW_BOX}
        className="mx-auto aspect-[5/6] h-56 touch-none rounded-lg border border-gold/30 bg-parchment-light"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {ordered.map((s, i) => (
          <path
            key={s.order}
            d={s.d}
            fill="none"
            stroke={i < strokeIndex ? "#c9a227" : "#f3e9d8"}
            strokeOpacity={i < strokeIndex ? 0.9 : 0.15}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {target && (
          <path
            d={ordered[strokeIndex].d}
            fill="none"
            stroke="#f3e9d8"
            strokeOpacity={0.5}
            strokeDasharray="3 3"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {trail.length > 1 && (
          <path
            d={trailToD(trail)}
            fill="none"
            stroke={status === "error" ? "#e63946" : "#8c1c13"}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <p className="mt-2 text-center text-sm text-ink/70">
        {done
          ? "全画なぞれました。"
          : status === "error"
            ? "線からはみ出しました。もう一度なぞってください。"
            : `${strokeIndex + 1} 画目をなぞってください（全${ordered.length}画）`}
      </p>
    </div>
  );
}

function NumberedStrokePicker({ strokes, onComplete }: TracingPracticeProps) {
  const ordered = useMemo(() => [...strokes].sort((a, b) => a.order - b.order), [strokes]);
  const [shuffled] = useState(() => [...ordered].sort(() => Math.random() - 0.5));
  const [nextOrder, setNextOrder] = useState(1);
  const [errorId, setErrorId] = useState<number | null>(null);
  const done = nextOrder > ordered.length;

  function pick(stroke: Stroke) {
    if (stroke.order === nextOrder) {
      setErrorId(null);
      const next = nextOrder + 1;
      setNextOrder(next);
      if (next > ordered.length) onComplete();
    } else {
      setErrorId(stroke.order);
      setNextOrder(1);
    }
  }

  return (
    <div>
      <svg viewBox={STROKE_VIEW_BOX} className="mx-auto h-40 w-auto" aria-hidden="true">
        {ordered.map((s) => (
          <path
            key={s.order}
            d={s.d}
            fill="none"
            stroke="#c9a227"
            strokeOpacity={s.order < nextOrder ? 0.9 : 0.12}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <p className="mt-2 text-center text-sm text-ink/70">
        {done ? "正しい順番を選べました。" : "図形が現れる順番どおりに、下のかけらをタップしてください。"}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {shuffled.map((s) => {
          const isDone = s.order < nextOrder;
          return (
            <button
              key={s.order}
              type="button"
              disabled={isDone}
              onClick={() => pick(s)}
              className={`h-14 w-14 rounded-md border p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                isDone
                  ? "border-gold bg-gold/20"
                  : errorId === s.order
                    ? "border-vermillion bg-vermillion/20"
                    : "border-gold/40 bg-parchment-light hover:border-gold"
              }`}
            >
              <svg viewBox={STROKE_VIEW_BOX} className="h-full w-full">
                <path
                  d={s.d}
                  fill="none"
                  stroke="#f3e9d8"
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TracingPractice({ strokes, onComplete }: TracingPracticeProps) {
  const [mode, setMode] = useState<"pointer" | "numbered">("pointer");

  return (
    <div>
      <div className="mb-3 flex justify-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("pointer")}
          aria-pressed={mode === "pointer"}
          className={`rounded-md border px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${mode === "pointer" ? "border-gold bg-gold/20" : "border-gold/30"}`}
        >
          指でなぞる
        </button>
        <button
          type="button"
          onClick={() => setMode("numbered")}
          aria-pressed={mode === "numbered"}
          className={`rounded-md border px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${mode === "numbered" ? "border-gold bg-gold/20" : "border-gold/30"}`}
        >
          順番で選ぶ（代替手段）
        </button>
      </div>
      {mode === "pointer" ? (
        <PointerTracer strokes={strokes} onComplete={onComplete} />
      ) : (
        <NumberedStrokePicker strokes={strokes} onComplete={onComplete} />
      )}
    </div>
  );
}
