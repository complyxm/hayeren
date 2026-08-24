/**
 * なぞり書き判定のための純粋関数群。DOM/SVGのAPIには依存しない
 * （CLAUDE.md §8「移植性」— src/domain は React/DOM に依存しない）。
 *
 * content/alphabet.json の lowerStrokes.d は "M x,y L x,y L x,y ..." の
 * 直線近似（generate-alphabet-strokes.mjs が M/L のみを出力する）なので、
 * 一般的なSVGパースライブラリを使わず単純な文字列分解で読み取れる。
 */

export interface Point {
  x: number;
  y: number;
}

export function parseLinePath(d: string): Point[] {
  return d
    .trim()
    .split(/(?=[ML])/)
    .filter(Boolean)
    .map((seg) => {
      const [xStr, yStr] = seg.slice(1).trim().split(",");
      return { x: Number(xStr), y: Number(yStr) };
    });
}

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

/** polyline 全体までの最短距離。 */
export function distanceToPolyline(p: Point, polyline: Point[]): number {
  let min = Infinity;
  for (let i = 1; i < polyline.length; i++) {
    min = Math.min(min, distancePointToSegment(p, polyline[i - 1], polyline[i]));
  }
  return min;
}

/**
 * polyline の始点を0、終点を1とした弧長パラメータ上で、点 p に最も近い位置を返す。
 * なぞりが「どこまで進んだか」の判定に使う。
 */
export function progressAlongPolyline(p: Point, polyline: Point[]): number {
  const segLengths: number[] = [];
  let total = 0;
  for (let i = 1; i < polyline.length; i++) {
    const len = Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y);
    segLengths.push(len);
    total += len;
  }
  if (total === 0) return 1;

  let bestDist = Infinity;
  let bestLenSoFar = 0;
  let lenSoFar = 0;
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1];
    const b = polyline[i];
    const segLen = segLengths[i - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    let t = lengthSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    const dist = Math.hypot(p.x - projX, p.y - projY);
    if (dist < bestDist) {
      bestDist = dist;
      bestLenSoFar = lenSoFar + t * segLen;
    }
    lenSoFar += segLen;
  }
  return bestLenSoFar / total;
}

export interface TracePointResult {
  /** 目標パスからの距離が許容誤差内か。 */
  onPath: boolean;
  /** 0〜1。目標パス上でどこまで進んだ位置に最も近いか。 */
  progress: number;
}

/**
 * なぞり中の1点を判定する。閾値はUI側の設定値として渡す
 * （CLAUDE.md §10: 較正前の数値をハードコードしない）。
 */
export function evaluateTracePoint(p: Point, target: Point[], toleranceUnits: number): TracePointResult {
  return {
    onPath: distanceToPolyline(p, target) <= toleranceUnits,
    progress: progressAlongPolyline(p, target),
  };
}

/** ストロークの完了に必要な最低到達率。 */
export const COMPLETION_THRESHOLD = 0.85;
