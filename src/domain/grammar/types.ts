/**
 * 東アルメニア語 活用・格変化エンジンの型 (curriculum.md §2.4)。
 * src/domain/ は React・DOM・Web API に依存しない (CLAUDE.md §8)。
 * ここの型は content スキーマ (src/data/schemas/grammar.ts) とは独立に定義し、
 * 連結キー "1sg" 等の綴りだけを共有する (data 側が z.enum で同じ集合を持つ)。
 */

/** 人称 1/2/3。 */
export type GrammarPerson = 1 | 2 | 3;
/** 数 単数/複数。 */
export type GrammarNumber = "sg" | "pl";

/** "1sg" 形式の連結キー。content/grammar/*.json と exceptions.json のキーに一致。 */
export type PersonNumberKey = "1sg" | "2sg" | "3sg" | "1pl" | "2pl" | "3pl";

/**
 * 時制。
 * - present   現在 (分詞 + եմ 系列)                     … 課 L06
 * - imperfect 過去進行 / 未完了 (分詞 + էի 系列)         … 課 L17
 * - future    未来 (不定詞 + ու + եմ 系列)               … 課 L19
 * - aorist    アオリスト / 単純過去 (総合形。助動詞なし)  … 課 L18
 * - subjunctive 接続法 (պետք է / որ 節 / 勧誘)          … 課 L22 / L23
 * - conditional 条件法 (կ- + 接続法)                    … 課 L24
 * 「時制」と呼んでいるが subjunctive / conditional は法 (mood)。UI とデータのキーを
 * 増やさないために同じ軸で扱っている。
 */
export type Tense = "present" | "imperfect" | "future" | "aorist" | "subjunctive" | "conditional";
/** 肯定 / 否定。 */
export type Polarity = "affirmative" | "negative";

export interface ConjugateOptions {
  person: GrammarPerson;
  number: GrammarNumber;
  /** 既定 "present"。 */
  tense?: Tense;
  /** 既定 "affirmative"。 */
  polarity?: Polarity;
}

/** ある時制の全人称・数の定形マップ。補充法動詞 (եմ / ունեմ / գիտեմ 系列とその過去) で使う。 */
export type FiniteForms = Record<PersonNumberKey, string>;

/**
 * 規則で導出できない動詞 (curriculum.md §2.4:「規則より優先する」)。
 * - present / presentNegative: -ում 分詞をとらない補充法。全人称の定形を直接持つ。
 * - imperfect / imperfectNegative: その過去 (էի / ունեի / գիտեի 系列)。
 *   規則の迂言形 "ունենում էի" も実在するが意味がずれる (「持つに至っていた」) ので、
 *   現在が補充法の動詞は過去も明示させる — engine は推測しない。
 * - presentParticiple: 分詞だけが不規則 (գալ→գալիս)。現在・過去進行の両方で使う。
 * - aorist: アオリスト (単純過去) の全人称定形。語幹が規則で導けない語 (ուտել→կերա,
 *   ասել→ասացի, տանել→տարա…) と、語尾クラスが規則と違う語で使う。
 * - aoristNegative: 省略時は aorist に չ- を付けて導出する (東アルメニア語のアオリスト否定は
 *   一律 չ- 接頭。Wiktionary «գալ» չեկա / «ուտել» չկերա / «լինել» չեղա 等で確認)。
 *   綴りが変わる語が見つかった場合だけここに明示する。
 * 未来は補充法動詞でも不定詞から規則的に作れる (ունենալու եմ) のでフィールドを持たない。
 */
export interface VerbIrregularity {
  present?: FiniteForms;
  presentNegative?: FiniteForms;
  imperfect?: FiniteForms;
  imperfectNegative?: FiniteForms;
  presentParticiple?: string;
  aorist?: FiniteForms;
  aoristNegative?: FiniteForms;
  /**
   * 接続法の全人称定形。今のところ確認した動詞はすべて規則どおりなので実データは無いが、
   * 「規則 + 例外の二層、例外が優先」という契約 (curriculum.md §2.4) を接続法だけ
   * 欠かさないために置く。条件法 (կ-) と否定条件法もこの形から作られる。
   */
  subjunctive?: FiniteForms;
}

export interface ConjugationResult {
  /** 提示・採点に使う完成形。肯定 "գրում եմ" / 否定 "չեմ գրում"。 */
  form: string;
  /**
   * 助動詞と組む非定形部分。現在・過去進行は未完了分詞 (գրում / գալիս)、
   * 未来は不定詞 + ու (գրելու)。補充法で非定形部分が無い場合は null。
   */
  participle: string | null;
  /** 助動詞。否定では չ- が付く (現在の迂言形の否定3単は չի、繋辞の չէ とは別)。 */
  auxiliary: string;
  /** 否定では助動詞が分詞の前に出る — 語順が変わる (curriculum.md §2.1、独立課 L07)。 */
  auxiliaryFirst: boolean;
}

/** curriculum.md §2.1 の7格。すべて decline() が扱う。 */
export type GrammarCase =
  | "nominative"
  | "genitive"
  | "dative"
  | "accusative"
  | "ablative"
  | "instrumental"
  | "locative";

export interface DeclineOptions {
  case: GrammarCase;
  /** 既定 "sg"。 */
  number?: GrammarNumber;
  /** 定冠詞を付けるか。既定 false。 */
  definite?: boolean;
  /**
   * 有生名詞か (人・動物)。対格の形が変わる (curriculum.md §2.1、L10):
   * 無生 → 主格と同形、有生 → 属格・与格と同形。既定 false (無生)。
   */
  animate?: boolean;
}

/**
 * 規則で導出できない名詞 (curriculum.md §2.4 / §3.3:「複数形・格変化形は規則任せにせず forms に持たせる」)。
 * - stem: 母音脱落など、語尾を付ける基礎となる語幹 (գիրք→գրք-)。省略時は見出し語をそのまま使う。
 * - plural: 主格複数の完成形 (音節脱落・補充法。տուն→տներ, մարդ→մարդիկ)。
 * - genitive: 属格・与格 単数の完成形 (非既定の曲用クラス。տուն→տան, հայր→հոր, օր→օրվա)。
 * - pluralGenitive: 属格・与格 複数の完成形。補充法複数 (մարդիկ→մարդկանց 等) で必須。
 *   規則的な -եր/-ներ 複数は自動で -ի を付けるのでここは不要。
 * - ablative / instrumental / locative: それぞれ単数の完成形。斜格で語幹が別形になる語
 *   (例: 家 → 奪格 tnicʻ) や非既定クラスで必須。既定クラスは語幹 + -ic'/-ov/-um で自動導出する。
 */
export interface NounIrregularity {
  stem?: string;
  plural?: string;
  genitive?: string;
  pluralGenitive?: string;
  ablative?: string;
  instrumental?: string;
  locative?: string;
}

export class AmbiguousDeclensionError extends Error {
  constructor(noun: string, detail: string) {
    super(`"${noun}" の曲用は規則だけでは一意に決まりません (${detail})。exceptions に明示してください`);
    this.name = "AmbiguousDeclensionError";
  }
}

export interface DeclensionResult {
  /** 完成形。 */
  form: string;
  /** 格語尾を付けた土台 (見出し語 or 語幹 or 複数形)。 */
  base: string;
  /** 付与した格語尾 ("" = 主格)。 */
  ending: string;
  /** 付与した定冠詞。無ければ null。 */
  definiteSuffix: string | null;
}
