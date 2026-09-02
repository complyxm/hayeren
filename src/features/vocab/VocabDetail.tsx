import { vocab } from "../../data/vocab";
import { useVocabAudio } from "./useVocabAudio";
import { Transliteration } from "../settings/transliteration";

const POS_LABEL_JA: Record<string, string> = {
  noun: "名詞",
  verb: "動詞",
  adjective: "形容詞",
  adverb: "副詞",
  pronoun: "代名詞",
  numeral: "数詞",
  postposition: "後置詞",
  conjunction: "接続詞",
  interjection: "間投詞",
  particle: "小辞",
};

interface VocabDetailProps {
  id: string;
  onBack: () => void;
}

export function VocabDetail({ id, onBack }: VocabDetailProps) {
  const entry = vocab.find((v) => v.id === id);
  const { canPlayWord, canPlayExample, playWord, playExample } = useVocabAudio(entry);

  if (!entry) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
        <p>語が見つかりませんでした。</p>
        <button type="button" onClick={onBack} className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          語彙に戻る
        </button>
      </main>
    );
  }

  const forms = Object.entries(entry.forms);

  return (
    <main className="min-h-screen bg-parchment px-4 py-8 text-ink">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-ink/70 underline decoration-gold/50 underline-offset-4 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          ← 語彙に戻る
        </button>

        <div className="rounded-xl border border-gold/30 bg-parchment-light p-6 text-center">
          <p lang="hy" className="font-serif text-4xl leading-snug text-ink">
            {entry.hy}
          </p>
          <p className="mt-2 text-sm text-ink/70">
            <Transliteration text={`${entry.translit} ／ `} />
            IPA {entry.ipa} ／ {POS_LABEL_JA[entry.pos]}
          </p>
          <p className="mt-3 text-lg">{entry.ja.join("、")}</p>
          {canPlayWord && (
            <button
              type="button"
              onClick={playWord}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-gold bg-gold/20 px-4 py-1.5 text-sm hover:bg-gold/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span aria-hidden="true">♪</span> 発音を聞く
            </button>
          )}
        </div>

        {entry.ruCognate && (
          <section className="mt-4 rounded-md border border-vermillion/40 bg-vermillion/10 p-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-vermillion">ロシア語由来</p>
            <p lang="ru" className="mt-1 font-serif text-lg text-ink">
              {entry.ruCognate.form}
            </p>
            <p className="mt-1 text-ink/80">{entry.ruCognate.note}</p>
            <p className="mt-2 text-xs text-ink/50">
              ここだけは2言語を並べます。片方を覚えるともう片方が半分ただで手に入るためです。
            </p>
          </section>
        )}

        {forms.length > 0 && (
          <section className="mt-4 rounded-md border border-gold/30 bg-parchment-light p-3 text-sm">
            <h2 className="mb-1 font-bold text-ink/70">不規則な形</h2>
            <ul>
              {forms.map(([key, value]) => (
                <li key={key}>
                  {key}: <span lang="hy">{value}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4 rounded-md border border-lapis/50 bg-lapis/10 p-3 text-sm">
          <p lang="hy" className="font-serif text-lg">
            {entry.example.hy}
          </p>
          <p className="mt-1 text-ink/80">{entry.example.ja}</p>
          {canPlayExample && (
            <button
              type="button"
              onClick={playExample}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-lapis/60 bg-lapis/10 px-3 py-1 text-xs hover:bg-lapis/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <span aria-hidden="true">♪</span> 例文を聞く
            </button>
          )}
        </section>

        {canPlayWord || canPlayExample ? (
          <p className="mt-2 text-center text-[11px] text-ink/50">
            機械合成の暫定音声（eSpeak NG）。発音の細部は参考程度に。
          </p>
        ) : (
          <p className="mt-4 text-xs text-ink/40">音声はまだありません。</p>
        )}
      </div>
    </main>
  );
}
