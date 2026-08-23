import Dexie, { type EntityTable } from "dexie";

/**
 * ts-fsrs の Card 型と互換の形状にしておく（Phase 2 で ts-fsrs を導入する際、
 * このテーブルをそのまま読み書きできるようにするため）。
 * 参照: https://github.com/open-spaced-repetition/ts-fsrs
 */
export type CardState = "new" | "learning" | "review" | "relearning";

export interface CardRecord {
  id: string;
  /** content/ 内のエントリ（語彙・文字など）を指す外部キー。Phase 1 以降で使用 */
  contentId: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: Date | null;
}

export type ReviewRating = 1 | 2 | 3 | 4;

export interface ReviewRecord {
  id: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: Date;
  stateBefore: CardState;
  stateAfter: CardState;
}

export interface SettingsRecord {
  id: "singleton";
  showTransliteration: boolean;
  dailyNewCardLimit: number;
}

export class HayerenDB extends Dexie {
  cards!: EntityTable<CardRecord, "id">;
  reviews!: EntityTable<ReviewRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;

  constructor() {
    super("hayeren");
    this.version(1).stores({
      cards: "id, contentId, due, state",
      reviews: "id, cardId, reviewedAt",
      settings: "id",
    });
  }
}

export const db = new HayerenDB();
