import { State, createEmptyCard, fsrs, generatorParameters } from "ts-fsrs";
import type { Card as FsrsCard, Grade } from "ts-fsrs";
import type { CardState, ReviewRating, SrsCard } from "./types";

/**
 * このアプリは1日に数回開く学習アプリで、Anki のような「数分後にもう一度出す」
 * 短期学習ステップ（learning_steps）は想定しない。enable_short_term:false にすると
 * ts-fsrs は常に日単位でスケジューリングする（内部で LongTermScheduler を使う）。
 * 参照: https://github.com/open-spaced-repetition/ts-fsrs（FSRSParameters.enable_short_term）
 */
const params = generatorParameters({ enable_short_term: false });
const scheduler = fsrs(params);

const STATE_TO_DOMAIN: Record<State, CardState> = {
  [State.New]: "new",
  [State.Learning]: "learning",
  [State.Review]: "review",
  [State.Relearning]: "relearning",
};

const STATE_FROM_DOMAIN: Record<CardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

function toDomainCard(card: FsrsCard): SrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_TO_DOMAIN[card.state],
    lastReview: card.last_review ?? null,
  };
}

function toFsrsCard(card: SrsCard): FsrsCard {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    // elapsed_days は非推奨のうえ、ts-fsrs が due/last_review から毎回再計算するため
    // 渡す値に意味はない（ts-fsrs dist/index.mjs の AbstractScheduler.init() 参照）。
    elapsed_days: 0,
    scheduled_days: card.scheduledDays,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: STATE_FROM_DOMAIN[card.state],
    last_review: card.lastReview ?? undefined,
  };
}

/** 未学習のカードを作成する。 */
export function createNewCard(now: Date): SrsCard {
  return toDomainCard(createEmptyCard(now));
}

/** 評価を反映し、次回の due 等を更新したカードを返す（FSRS本体は呼び出し側に漏らさない）。 */
export function scheduleReview(card: SrsCard, rating: ReviewRating, now: Date): SrsCard {
  const { card: nextCard } = scheduler.next(toFsrsCard(card), now, rating as Grade);
  return toDomainCard(nextCard);
}

/** カードが今の時点で復習対象（due が来ている）かどうか。 */
export function isDue(card: SrsCard, now: Date): boolean {
  return card.due.getTime() <= now.getTime();
}
