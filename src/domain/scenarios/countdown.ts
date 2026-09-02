/**
 * 目標日までの残り日数（curriculum.md §7.4）。
 * **設定は任意**なので、未設定（null）でも呼び出し側が困らない形で返す。
 *
 * 時刻ではなく暦日で数える — 「あと1日」は24時間後という意味ではなく「明日」。
 * タイムゾーンは端末のローカル時間に従う（サーバーを持たないアプリなので
 * ユーザーのいる場所の日付がそのまま正しい）。
 */
export interface Countdown {
  /** 残り日数。今日なら 0、過ぎていれば負。 */
  days: number;
  /** 予定日を過ぎているか。 */
  past: boolean;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "2026-12-24" 形式の日付をローカルの暦日として解釈する（UTC ずれを避ける）。 */
export function parseTargetDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(iso);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  // 2026-02-30 のような存在しない日付は Date が繰り上げるので、往復で弾く。
  if (date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return date;
}

export function countdownTo(targetIso: string | null, now: Date): Countdown | null {
  if (targetIso === null) return null;
  const target = parseTargetDate(targetIso);
  if (target === null) return null;
  const days = Math.round((target.getTime() - startOfDay(now).getTime()) / 86_400_000);
  return { days, past: days < 0 };
}
