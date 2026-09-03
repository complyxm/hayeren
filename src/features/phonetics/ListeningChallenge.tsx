import { useCallback, useEffect, useRef, useState } from "react";
import { listeningPairs } from "../../data/listening";
import { getListeningStats, recordListeningAttempt, type ListeningStats } from "../../data/listeningRepository";
import type { ListeningItem } from "../../data/schemas/listening";

interface Props {
  onBack: () => void;
  /** クレジット画面へ。CC BY-SA の帰属表示は義務なので、音声を使う画面から必ず辿れるようにする。 */
  onCredits: () => void;
}

/** 反応時間の計測に使う時計。コンポーネントの外に出して純粋性の検査から外す。 */
const clock = { now: () => performance.now() };

/** 出題順。毎回同じだと語ごと覚えてしまうので、開くたびに並べ替える。 */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 聞き分けチャレンジ（roadmap 3-2）。**産出の前に知覚。** 自分で発音する 3-3 より
 * 先に置く課で、日本語だとどちらも「パ」に聞こえる2つの音を耳で分ける練習。
 *
 * 音声は人間の録音（Wikimedia Commons, CC BY-SA）。合成音は帯気の差もふるえの
 * 接触回数も正しく作らないので、この課には使えない。
 *
 * 対立は複数ある（`պ/փ` の帯気、`ռ/ր` のふるえ）。**混ぜて出題しない** —
 * 一度に1つの対立だけを聞き分けるほうが耳が育つし、成績もペアごとに見せる。
 *
 * docs/interaction.md は4択を戒めているが、**知覚訓練だけは2択が正しい形**
 * （「4択が許されるのは知覚訓練（音や字形の聞き分け・見分け）だけ」）。
 * 正誤に加えて**反応時間**を測る — 2択は当てずっぽうでも5割当たるし、
 * 正解していても迷っていれば聞き分けられていないため。
 */
export function ListeningChallenge({ onBack, onCredits }: Props) {
  const [pairId, setPairId] = useState(listeningPairs[0].pairId);
  const pair = listeningPairs.find((p) => p.pairId === pairId) ?? listeningPairs[0];
  const [queue, setQueue] = useState<ListeningItem[]>(() => shuffle(listeningPairs[0].items));
  const [index, setIndex] = useState(0);
  const [played, setPlayed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [stats, setStats] = useState<ListeningStats | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 音が鳴り終わった時刻。ここから選ぶまでを反応時間とする。 */
  const heardAt = useRef<number | null>(null);

  const item = index < queue.length ? queue[index] : undefined;

  const refreshStats = useCallback(() => {
    getListeningStats(pairId).then(setStats);
  }, [pairId]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  function selectPair(nextPairId: string) {
    if (nextPairId === pairId) return;
    const next = listeningPairs.find((p) => p.pairId === nextPairId);
    if (!next) return;
    setPairId(nextPairId);
    setQueue(shuffle(next.items));
    setIndex(0);
    setChosen(null);
    setPlayed(false);
    setStats(null);
    heardAt.current = null;
  }

  function play() {
    if (!item) return;
    setAudioError(null);
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = `${import.meta.env.BASE_URL}${item.audio}`;
    audio.onended = () => {
      heardAt.current = clock.now();
      setPlayed(true);
    };
    // 再生できない環境（コーデック非対応など）では黙って壊れず理由を出す。
    audio.onerror = () => setAudioError("この端末では音声を再生できませんでした。");
    audio.play().catch(() => setAudioError("音声を再生できませんでした。もう一度試してください。"));
  }

  async function choose(letter: string) {
    if (!item || chosen !== null) return;
    setChosen(letter);
    await recordListeningAttempt({
      pairId,
      word: item.word,
      correctLetter: item.letter,
      chosenLetter: letter,
      reactionMs: heardAt.current === null ? 0 : Math.round(clock.now() - heardAt.current),
      answeredAt: new Date(),
    });
    refreshStats();
  }

  function next() {
    setChosen(null);
    setPlayed(false);
    heardAt.current = null;
    if (index + 1 >= queue.length) {
      setQueue(shuffle(pair.items));
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
  }

  const correct = chosen !== null && item !== undefined && chosen === item.letter;

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← ホームに戻る
        </button>

        <h1 className="font-serif text-3xl font-bold">聞き分け</h1>

        <div role="tablist" aria-label="聞き分ける音の組" className="mt-4 flex gap-2">
          {listeningPairs.map((p) => (
            <button
              key={p.pairId}
              type="button"
              role="tab"
              aria-selected={p.pairId === pairId}
              onClick={() => selectPair(p.pairId)}
              className={`rounded-md border px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                p.pairId === pairId
                  ? "border-gold bg-gold/20 text-ink"
                  : "border-gold/30 bg-parchment hover:border-gold"
              }`}
            >
              <span lang="hy" className="font-serif text-lg">
                {p.choices[0]} / {p.choices[1]}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-ink/70">{pair.note_ja}</p>

        {item && (
          <section className="mt-6 rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
            <p className="text-xs uppercase tracking-widest text-ink/60">
              {index + 1} / {queue.length}
            </p>

            <button
              type="button"
              onClick={play}
              className="mt-4 rounded-md border border-gold bg-gold/20 px-6 py-3 text-base hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span aria-hidden="true">♪</span> {played ? "もう一度聞く" : "聞く"}
            </button>

            {audioError && <p className="mt-3 text-sm text-vermillion-text">{audioError}</p>}

            <p className="mt-6 text-sm text-ink/70">{pair.prompt_ja}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {pair.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  lang="hy"
                  disabled={!played || chosen !== null}
                  onClick={() => choose(choice)}
                  className={`rounded-lg border px-4 py-5 font-serif text-4xl transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40 ${
                    chosen === null
                      ? "border-gold/40 bg-parchment hover:border-gold"
                      : choice === item.letter
                        ? "border-gold bg-gold/25"
                        : "border-gold/20 bg-parchment"
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>
            {!played && <p className="mt-2 text-xs text-ink/60">先に音を聞いてください。</p>}

            {chosen !== null && (
              <div className="mt-5 text-sm">
                <p className={correct ? "text-gold" : "text-vermillion-text"}>
                  {correct ? "正解です。" : "違います。"}
                </p>
                <p lang="hy" className="mt-2 font-serif text-2xl">
                  {item.word}
                </p>
                <p className="mt-1 text-ink/80">{item.ja}</p>
                <button
                  type="button"
                  onClick={next}
                  className="mt-4 w-full rounded-md border border-gold bg-parchment px-4 py-2 text-sm hover:bg-parchment-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  次へ
                </button>
              </div>
            )}
          </section>
        )}

        {stats && stats.attempts > 0 && (
          <section className="mt-6 rounded-lg border border-gold/20 bg-parchment-light/60 p-4 text-sm">
            <p className="text-ink/80">
              直近10回の正解率 <b className="text-gold">{Math.round((stats.recentAccuracy ?? 0) * 100)}%</b>
              {stats.medianCorrectReactionMs !== null && (
                <>
                  {" "}／ 正解までの時間（中央値）{" "}
                  <b className="text-gold">{(stats.medianCorrectReactionMs / 1000).toFixed(1)} 秒</b>
                </>
              )}
            </p>
            <p className="mt-2 text-xs text-ink/60">
              2択なので当てずっぽうでも5割当たります。<b>速く決められるか</b>のほうが、聞き分けられている
              かどうかをよく表します。これまで {stats.attempts} 回。
            </p>
          </section>
        )}

        <p className="mt-6 text-xs text-ink/60">
          音声は Wikimedia Commons の録音（CC BY-SA）。
          <button
            type="button"
            onClick={onCredits}
            className="ml-1 underline decoration-gold/50 underline-offset-2 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            録音者を見る
          </button>
        </p>
      </div>
    </main>
  );
}
