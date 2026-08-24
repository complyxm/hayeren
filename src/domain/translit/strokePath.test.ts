import { describe, expect, it } from "vitest";
import {
  parseLinePath,
  distanceToPolyline,
  progressAlongPolyline,
  evaluateTracePoint,
} from "./strokePath";

describe("parseLinePath", () => {
  it("parses an M/L-only path into vertices", () => {
    expect(parseLinePath("M10.0,20.0 L30.0,20.0 L30.0,50.0")).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 50 },
    ]);
  });
});

describe("distanceToPolyline", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("is 0 for a point on the line", () => {
    expect(distanceToPolyline({ x: 50, y: 0 }, line)).toBe(0);
  });

  it("is the perpendicular distance for a point off the line", () => {
    expect(distanceToPolyline({ x: 50, y: 10 }, line)).toBe(10);
  });

  it("clamps to the endpoint beyond the segment", () => {
    expect(distanceToPolyline({ x: 150, y: 0 }, line)).toBe(50);
  });
});

describe("progressAlongPolyline", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("is 0 at the start and 1 at the end", () => {
    expect(progressAlongPolyline({ x: 0, y: 0 }, line)).toBe(0);
    expect(progressAlongPolyline({ x: 100, y: 0 }, line)).toBe(1);
  });

  it("is 0.5 at the midpoint", () => {
    expect(progressAlongPolyline({ x: 50, y: 0 }, line)).toBeCloseTo(0.5);
  });
});

describe("evaluateTracePoint", () => {
  const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ];

  it("flags points within tolerance as on-path", () => {
    const result = evaluateTracePoint({ x: 50, y: 5 }, line, 10);
    expect(result.onPath).toBe(true);
    expect(result.progress).toBeCloseTo(0.5);
  });

  it("flags points beyond tolerance as off-path", () => {
    const result = evaluateTracePoint({ x: 50, y: 20 }, line, 10);
    expect(result.onPath).toBe(false);
  });
});
