import Dexie, { type EntityTable } from "dexie";
import type { CardState, ReviewRating, SrsCard } from "../domain/srs/types";
import type { AttemptedTarget, PlosivePlace, VotJudgement } from "../domain/phonetics/calibration";

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

/**
 * 発音チェック（VOT）1回の録音の測定結果。curriculum.md §5「発音カードも SRS に
 * 載せる。判定結果（VOT値など）を履歴として保持し、改善の推移を見せる」のうち、
 * まず「履歴の保持」を満たす。SRS カード化（想起の間隔反復スケジューリング）は
 * VOT のような連続測定値をどう評価（Again/Hard/Good/Easy）に落とすかという
 * 別の設計判断が要るため、ここではまだ扱わない。
 */
export interface VotAttemptRecord {
  id: string;
  place: PlosivePlace;
  attempted: AttemptedTarget;
  votMs: number;
  judgement: VotJudgement;
  recordedAt: Date;
}

export class HayerenDB extends Dexie {
  cards!: EntityTable<CardRecord, "id">;
  reviews!: EntityTable<ReviewRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  votAttempts!: EntityTable<VotAttemptRecord, "id">;

  constructor() {
    super("hayeren");
    this.version(1).stores({
      cards: "id, contentId, due, state",
      reviews: "id, cardId, reviewedAt",
      settings: "id",
    });
    this.version(2).stores({
      cards: "id, contentId, due, state",
      reviews: "id, cardId, reviewedAt",
      settings: "id",
      votAttempts: "id, place, recordedAt",
    });
  }
}

export const db = new HayerenDB();
