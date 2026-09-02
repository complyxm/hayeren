import { createContext, useContext } from "react";

export interface TransliterationState {
  /** ローマ字転写を表示するか。読み込み中は既定の true。 */
  show: boolean;
  setShow: (next: boolean) => Promise<void>;
}

/**
 * ローマ字転写の表示状態（CLAUDE.md §6-7）。Provider と部品は
 * transliteration.tsx にある（コンポーネント以外を同じファイルから export すると
 * Fast Refresh が効かなくなるため分けてある）。
 */
export const TransliterationContext = createContext<TransliterationState>({
  show: true,
  setShow: async () => {},
});

export function useTransliteration(): TransliterationState {
  return useContext(TransliterationContext);
}
