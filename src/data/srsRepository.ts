import { buildReviewQueue, type QueueableCard } from "../domain/srs/queue";
import { createNewCard, scheduleReview } from "../domain/srs/scheduler";
import type { ReviewRating } from "../domain/srs/types";
import { db, type CardRecord, type ReviewRecord, type SettingsRecord } from "./db";

/** Anki 等の一般的な既定値を踏襲した初期値。設定画面（Phase 9）から変更できる。 */
const DEFAULT_DAILY_NEW_CARD_LIMIT = 10;

async function ensureSettings(): Promise<SettingsRecord> {
  const existing = await db.settings.get("singleton");
  if (existing) return existing;
  const created: SettingsRecord = {
    id: "singleton",
    showTransliteration: true,
    dailyNewCardLimit: DEFAULT_DAILY_NEW_CARD_LIMIT,
    vocabDailyNewCardLimit: DEFAULT_DAILY_NEW_CARD_LIMIT,
    l1SpeechOptIn: false,
    completedGrammarLessonIds: [],
    grammarDailyNewCardLimit: DEFAULT_DAILY_NEW_CARD_LIMIT,
  };
  await db.settings.put(created);
  return created;
}

export async function getDailyNewCardLimit(): Promise<number> {
  return (await ensureSettings()).dailyNewCardLimit;
}

export async function setDailyNewCardLimit(limit: number): Promise<void> {
  await ensureSettings();
  await db.settings.update("singleton", { dailyNewCardLimit: limit });
}

/** vocabDailyNewCardLimit が無いまま保存された既存レコード(移行前)は既定値扱いにする。 */
export async function getVocabDailyNewCardLimit(): Promise<number> {
  return (await ensureSettings()).vocabDailyNewCardLimit ?? DEFAULT_DAILY_NEW_CARD_LIMIT;
}

export async function setVocabDailyNewCardLimit(limit: number): Promise<void> {
  await ensureSettings();
  await db.settings.update("singleton", { vocabDailyNewCardLimit: limit });
}

/** grammarDailyNewCardLimit が無いまま保存された既存レコード(移行前)は既定値扱いにする。 */
export async function getGrammarDailyNewCardLimit(): Promise<number> {
  return (await ensureSettings()).grammarDailyNewCardLimit ?? DEFAULT_DAILY_NEW_CARD_LIMIT;
}

export async function setGrammarDailyNewCardLimit(limit: number): Promise<void> {
  await ensureSettings();
  await db.settings.update("singleton", { grammarDailyNewCardLimit: limit });
}

/** l1SpeechOptIn が無いまま保存された既存レコード(移行前)は false 扱いにする。 */
export async function getL1SpeechOptIn(): Promise<boolean> {
  return (await ensureSettings()).l1SpeechOptIn ?? false;
}

export async function setL1SpeechOptIn(optIn: boolean): Promise<void> {
  await ensureSettings();
  await db.settings.update("singleton", { l1SpeechOptIn: optIn });
}

/** completedGrammarLessonIds が無いまま保存された既存レコード(移行前)は空配列扱いにする。 */
export async function getCompletedGrammarLessonIds(): Promise<string[]> {
  return (await ensureSettings()).completedGrammarLessonIds ?? [];
}

export async function markGrammarLessonComplete(lessonId: string): Promise<void> {
  await ensureSettings();
  const current = await getCompletedGrammarLessonIds();
  if (current.includes(lessonId)) return;
  await db.settings.update("singleton", { completedGrammarLessonIds: [...current, lessonId] });
}

/**
 * content/ のエントリ（Phase 1 は文字）すべてに対してカードが存在するようにする。
 * 読み取り→書き込みを1つの rw トランザクションにまとめ、同時に2回呼ばれても
 * （例: React 18 StrictMode が effect を2回実行する開発時）重複作成でエラーに
 * ならないようにする。
 */
export async function ensureCardsFor(contentIds: string[], now: Date): Promise<void> {
  if (contentIds.length === 0) return;
  await db.transaction("rw", db.cards, async () => {
    const existing = await db.cards.where("contentId").anyOf(contentIds).toArray();
    const existingIds = new Set(existing.map((c) => c.contentId));
    const missing = contentIds.filter((id) => !existingIds.has(id));
    if (missing.length === 0) return;
    const created: CardRecord[] = missing.map((contentId) => ({
      id: contentId,
      contentId,
      ...createNewCard(now),
    }));
    await db.cards.bulkAdd(created);
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 今日すでに導入した新規カードの枚数。渡された contentIds の範囲だけで数える —
 * 文字用と語彙用で新規カード上限を別枠にする（2026-08-29、ユーザーとの合意事項）ため、
 * 一方のキューの新規カード導入がもう一方の予算を消費してはいけない。
 */
export async function countNewCardsIntroducedToday(contentIds: string[], now: Date): Promise<number> {
  const from = startOfDay(now);
  const reviewsToday = await db.reviews.where("reviewedAt").aboveOrEqual(from).toArray();
  const idSet = new Set(contentIds);
  return reviewsToday.filter((r) => idSet.has(r.cardId) && r.stateBefore === "new").length;
}

/** 指定した content id 群を対象に、今日のキュー（due の復習＋新規カード上限の残り枠）を組み立てる。 */
export async function getTodaysQueue(contentIds: string[], now: Date): Promise<QueueableCard[]> {
  await ensureCardsFor(contentIds, now);
  const cards = await db.cards.where("contentId").anyOf(contentIds).toArray();
  const [dailyNewCardLimit, newCardsIntroducedToday] = await Promise.all([
    getDailyNewCardLimit(),
    countNewCardsIntroducedToday(contentIds, now),
  ]);
  const queueable: QueueableCard[] = cards.map((c) => ({ contentId: c.contentId, card: c }));
  return buildReviewQueue(queueable, now, { dailyNewCardLimit, newCardsIntroducedToday });
}

/** 1枚のカードを評価し、カードの新しい状態と復習ログを永続化する。 */
export async function reviewCard(contentId: string, rating: ReviewRating, now: Date): Promise<CardRecord> {
  return db.transaction("rw", db.cards, db.reviews, async () => {
    const existing = await db.cards.get(contentId);
    if (!existing) throw new Error(`no card for contentId "${contentId}"`);

    const stateBefore = existing.state;
    const nextCard = scheduleReview(existing, rating, now);
    const updated: CardRecord = { ...existing, ...nextCard };

    const reviewRecord: ReviewRecord = {
      id: `${contentId}:${now.toISOString()}`,
      cardId: contentId,
      rating,
      reviewedAt: now,
      stateBefore,
      stateAfter: nextCard.state,
    };

    await db.cards.put(updated);
    await db.reviews.add(reviewRecord);

    return updated;
  });
}

export interface ProgressExport {
  version: 1;
  exportedAt: string;
  cards: CardRecord[];
  reviews: ReviewRecord[];
  settings: SettingsRecord[];
}

/** 進捗全体（カード・復習ログ・設定）を読み出す。 */
export async function exportProgress(): Promise<ProgressExport> {
  const [cards, reviews, settings] = await Promise.all([
    db.cards.toArray(),
    db.reviews.toArray(),
    db.settings.toArray(),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), cards, reviews, settings };
}

/** 進捗全体を置き換える（既存データは全削除してから書き戻す）。 */
export async function importProgress(data: ProgressExport): Promise<void> {
  await db.transaction("rw", db.cards, db.reviews, db.settings, async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    if (data.cards.length > 0) await db.cards.bulkAdd(data.cards);
    if (data.reviews.length > 0) await db.reviews.bulkAdd(data.reviews);
    if (data.settings.length > 0) await db.settings.bulkAdd(data.settings);
  });
}

/** JSON ファイルへの書き出し用。Date は ISO 文字列になる。 */
export function serializeProgress(data: ProgressExport): string {
  return JSON.stringify(data, null, 2);
}

/** JSON ファイルからの読み込み用。ISO 文字列を Date に戻す。 */
export function deserializeProgress(json: string): ProgressExport {
  const parsed = JSON.parse(json) as ProgressExport;
  return {
    ...parsed,
    cards: parsed.cards.map((c) => ({
      ...c,
      due: new Date(c.due),
      lastReview: c.lastReview ? new Date(c.lastReview) : null,
    })),
    reviews: parsed.reviews.map((r) => ({ ...r, reviewedAt: new Date(r.reviewedAt) })),
  };
}
