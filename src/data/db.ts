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
  /** 文字（アルファベット）の復習キュー専用の1日の新規カード上限。 */
  dailyNewCardLimit: number;
  /**
   * 語彙の復習キュー専用の1日の新規カード上限。文字用の dailyNewCardLimit とは
   * 別枠（ユーザーとの合意事項、2026-08-29）。文字と語彙のどちらか一方だけ
   * 大量に新規カードを導入しても、もう一方の新規枠を消費しない。
   */
  vocabDailyNewCardLimit: number;
  /**
   * L1（Web Speech API による音声認識マッチ）を有効にするか。既定オフ。
   * docs/phonetics.md「L1 は音声を Google のサーバーに送信する。オプトイン（既定オフ）」。
   */
  l1SpeechOptIn: boolean;
  /**
   * 完了した文法課の id（roadmap Phase 5「L01–L24 が前提課の順に解放」）。
   * 課の練習をひと通り解き終えると追加される。前提がこの集合に含まれる課だけを解放する。
   * 移行前レコード（このフィールドが無い）は空配列扱い。
   */
  completedGrammarLessonIds?: string[];
  /**
   * 文法練習の復習キュー専用の1日の新規カード上限。文字・語彙とは別枠
   * （ユーザーとの合意事項、2026-08-29「コンテンツ種別ごとに独立した枠を持たせる」）。
   * 移行前レコード（このフィールドが無い）は既定値扱い。
   */
  grammarDailyNewCardLimit?: number;
  /**
   * 「安定」とみなす FSRS stability（日）の下限。curriculum.md §7.1 の既定は 21 日。
   * 場面ユニットの通過判定と到達度メーターがこの値を使う（判定そのものは
   * src/domain/srs/stability.ts の isStable() 1箇所に集約）。
   * 移行前レコード（このフィールドが無い）は既定値扱い。
   */
  stabilityThresholdDays?: number;
  /**
   * 看板読解（curriculum.md §7.2）の復習キュー専用の1日の新規カード上限。
   * 文字・語彙・文法とは別枠。移行前レコード（このフィールドが無い）は既定値扱い。
   */
  signDailyNewCardLimit?: number;
  /**
   * エレバンに行く予定日（"YYYY-MM-DD"）。curriculum.md §7.4。
   * **設定は任意**で、未設定（undefined）でも全機能が動く。
   */
  targetDate?: string;
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
