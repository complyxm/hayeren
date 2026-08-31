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

/** 時制。現在形のみ実装済み (roadmap Phase 5、他は後続コミット)。 */
export type Tense = "present";
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

/** 現在形の全人称・数の定形マップ。補充法動詞 (եմ / ունեմ / գիտեմ 系列) で使う。 */
export type FinitePresentForms = Record<PersonNumberKey, string>;

/**
 * 規則で導出できない動詞 (curriculum.md §2.4:「規則より優先する」)。
 * - present / presentNegative: -ում 分詞をとらない補充法。全人称の定形を直接持つ。
 * - presentParticiple: 分詞だけが不規則 (գալ→գալիս)。助動詞は規則どおり付ける。
 */
export interface VerbIrregularity {
  present?: FinitePresentForms;
  presentNegative?: FinitePresentForms;
  presentParticiple?: string;
}

export interface ConjugationResult {
  /** 提示・採点に使う完成形。肯定 "գրում եմ" / 否定 "չեմ գրում"。 */
  form: string;
  /** 現在分詞。補充法で分詞が無い場合は null。 */
  participle: string | null;
  /** 助動詞。否定では չ- が付く (迂言形の否定3単は չի、繋辞の չէ とは別)。 */
  auxiliary: string;
  /** 否定では助動詞が分詞の前に出る — 語順が変わる (curriculum.md §2.1、独立課 L07)。 */
  auxiliaryFirst: boolean;
}
