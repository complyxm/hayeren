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
  /**
   * ロシア語レイヤーの復習キュー専用の1日の新規カード上限。
   * **アルメニア語とは完全に別枠**（docs/russian.md §3「レビューキューを完全に分ける」）。
   */
  russianDailyNewCardLimit?: number;
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

/**
 * 聞き分けチャレンジ（roadmap 3-2）1問ぶんの結果。**産出の前に知覚**を鍛える課なので、
 * 正誤だけでなく**反応時間**も残す — 正解していても迷っているうちは聞き分けられて
 * いない、という差がここに出る。
 */
export interface ListeningAttemptRecord {
  id: string;
  /**
   * どの2項対立の問題だったか（content/listening.json の pairId）。
   * 対立ごとに難しさが違うので、成績を混ぜずにペア単位で見せるために持つ。
   */
  pairId: string;
  /** 出題した語（content/listening.json の word）。 */
  word: string;
  /** 実際にその語に含まれていた字。 */
  correctLetter: string;
  /** 学習者が選んだ字。 */
  chosenLetter: string;
  /** 音が鳴り終わってから選ぶまでのミリ秒。 */
  reactionMs: number;
  answeredAt: Date;
}

/**
 * 母音のフォルマント測定1回分（docs/phonetics.md §3b）。
 * **母音ごとに最新の1回だけ**を残す（id は母音の id そのもの）。母音四辺形は
 * 6つの点の位置関係を見る図なので、同じ母音の古い点が重なっていても読めない。
 */
export interface VowelAttemptRecord {
  id: string;
  f1Hz: number;
  f2Hz: number;
  f3Hz: number | null;
  recordedAt: Date;
}

export class HayerenDB extends Dexie {
  cards!: EntityTable<CardRecord, "id">;
  reviews!: EntityTable<ReviewRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  votAttempts!: EntityTable<VotAttemptRecord, "id">;
  listeningAttempts!: EntityTable<ListeningAttemptRecord, "id">;
  vowelAttempts!: EntityTable<VowelAttemptRecord, "id">;

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
    this.version(3).stores({
      cards: "id, contentId, due, state",
      reviews: "id, cardId, reviewedAt",
      settings: "id",
      votAttempts: "id, place, recordedAt",
      listeningAttempts: "id, word, answeredAt",
    });
    // v4: 聞き分けを複数の2項対立（պ/փ に加えて ռ/ր）に広げたので、記録に pairId を足す。
    // 既存の記録はすべて պ/փ のものなので、そう埋めてから索引を張る。
    this.version(4)
      .stores({
        cards: "id, contentId, due, state",
        reviews: "id, cardId, reviewedAt",
        settings: "id",
        votAttempts: "id, place, recordedAt",
        listeningAttempts: "id, word, pairId, answeredAt",
      })
      .upgrade((tx) =>
        tx
          .table<ListeningAttemptRecord>("listeningAttempts")
          .toCollection()
          .modify((a) => {
            a.pairId ??= "p-ph";
          }),
      );
    // v5: 母音のフォルマント測定（Phase 8）。母音ごとに最新の1回を持つ。
    this.version(5).stores({
      cards: "id, contentId, due, state",
      reviews: "id, cardId, reviewedAt",
      settings: "id",
      votAttempts: "id, place, recordedAt",
      listeningAttempts: "id, word, pairId, answeredAt",
      vowelAttempts: "id, recordedAt",
    });
  }
}

export const db = new HayerenDB();
