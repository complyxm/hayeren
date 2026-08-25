export type CardState = "new" | "learning" | "review" | "relearning";

/** FSRS の Grade（Manual=0 を除く）と数値表現が一致する: 1=もう一度, 2=難しい, 3=普通, 4=簡単。 */
export type ReviewRating = 1 | 2 | 3 | 4;

/**
 * アプリが持ち回るカードの状態。ts-fsrs の `Card` 型そのものではなく、
 * このアプリで実際に使うフィールドだけを持つ（CLAUDE.md §8: アプリの都合を
 * FSRS に、FSRS の都合をアプリに漏らさない）。
 */
export interface SrsCard {
  due: Date;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: Date | null;
}
