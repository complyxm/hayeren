import type { AttemptedTarget, PlosivePlace, VotJudgement } from "../domain/phonetics/calibration";
import { db, type VotAttemptRecord } from "./db";

export interface NewVotAttempt {
  place: PlosivePlace;
  attempted: AttemptedTarget;
  votMs: number;
  judgement: VotJudgement;
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
