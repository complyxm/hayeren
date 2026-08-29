import Dexie, { type EntityTable } from "dexie";
import type { CardState, ReviewRating, SrsCard } from "../domain/srs/types";

export type { CardState, ReviewRating };

export interface CardRecord extends SrsCard {
  /** content/ 内のエントリ（語彙・文字など）の id と同じ値にする（1コンテンツ = 1カード）。 */
  id: string;
  contentId: string;
}

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
  /**
   * L1（Web Speech API による音声認識マッチ）を有効にするか。既定オフ。
   * docs/phonetics.md「L1 は音声を Google のサーバーに送信する。オプトイン（既定オフ）」。
   */
  l1SpeechOptIn: boolean;
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
