import type { AttemptedSeries, PlosivePlace, ThreeWayJudgement } from "../domain/phonetics/calibration";
import { db, type ShadowAttemptRecord, type VotAttemptRecord, type VowelAttemptRecord } from "./db";

export interface NewVotAttempt {
  place: PlosivePlace;
  attempted: AttemptedSeries;
  votMs: number;
  judgement: ThreeWayJudgement;
  recordedAt: Date;
}

/** VOT の録音1回分を保存する。curriculum.md §5「判定結果を履歴として保持」。 */
export async function recordVotAttempt(attempt: NewVotAttempt): Promise<void> {
  const record: VotAttemptRecord = {
    id: `${attempt.recordedAt.toISOString()}-${Math.random().toString(36).slice(2, 8)}`,
    ...attempt,
  };
  await db.votAttempts.add(record);
}

/** 指定した place の履歴を録音日時の昇順(古い順)で返す。 */
export async function getVotAttempts(place: PlosivePlace): Promise<VotAttemptRecord[]> {
  const attempts = await db.votAttempts.where("place").equals(place).toArray();
  return attempts.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
}

export interface NewVowelAttempt {
  vowelId: string;
  f1Hz: number;
  f2Hz: number;
  f3Hz: number | null;
  recordedAt: Date;
}

/**
 * 母音のフォルマント測定を保存する（母音ごとに最新の1回で上書き）。
 * 四辺形は6つの点の位置関係を読む図なので、同じ母音の古い点を重ねると読めなくなる。
 */
export async function recordVowelAttempt(attempt: NewVowelAttempt): Promise<void> {
  await db.vowelAttempts.put({
    id: attempt.vowelId,
    f1Hz: attempt.f1Hz,
    f2Hz: attempt.f2Hz,
    f3Hz: attempt.f3Hz,
    recordedAt: attempt.recordedAt,
  });
}

/** 測定済みの母音を返す（測っていない母音は含まれない）。 */
export async function getVowelAttempts(): Promise<VowelAttemptRecord[]> {
  return db.vowelAttempts.toArray();
}

/** 測定をやり直せるように、1つ消す。 */
export async function clearVowelAttempt(vowelId: string): Promise<void> {
  await db.vowelAttempts.delete(vowelId);
}

export interface ShadowProgress {
  /** 今回の距離。 */
  distance: number;
  /** 今回より前の最良の距離。初回は null。 */
  previousBest: number | null;
  /** 直前の距離。初回は null。 */
  previousLast: number | null;
}

/**
 * まねる練習の1回を記録し、**それ以前**の記録と一緒に返す。
 * 「今回どうだったか」は過去との比較でしか言えないので、更新前の値を返す
 * （呼び出し側が読み直す必要をなくす）。
 */
export async function recordShadowAttempt(id: string, distance: number): Promise<ShadowProgress> {
  const before = await db.shadowAttempts.get(id);
  await db.shadowAttempts.put({
    id,
    bestDistance: before ? Math.min(before.bestDistance, distance) : distance,
    lastDistance: distance,
    attempts: (before?.attempts ?? 0) + 1,
    updatedAt: new Date(),
  });
  return {
    distance,
    previousBest: before?.bestDistance ?? null,
    previousLast: before?.lastDistance ?? null,
  };
}

/** 出題 id をキーにした、まねる練習の記録。 */
export async function getShadowAttempts(): Promise<Map<string, ShadowAttemptRecord>> {
  const records = await db.shadowAttempts.toArray();
  return new Map(records.map((r) => [r.id, r]));
}
