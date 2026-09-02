import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getShowTransliteration, setShowTransliteration } from "../../data/srsRepository";
import { TransliterationContext, useTransliteration } from "./transliterationContext";

/**
 * ローマ字転写の表示切替（CLAUDE.md §6-7「転写は補助輪。転写を非表示にできる設定を
 * 必ず用意する」）。
 *
 * 設定は1箇所（Dexie の settings）にあり、画面ごとに読み直すと表示がちらつくので
 * アプリ全体を1つの Provider で包んで1回だけ読む。
 */
export function TransliterationProvider({ children }: { children: ReactNode }) {
  const [show, setShowState] = useState(true);
  // 起動直後に切り替えると、遅れて解決する初回読み込みが選択を上書きしてしまう。
  // 一度でもユーザーが触ったら、初回読み込みの結果は捨てる。
  const touched = useRef(false);

  useEffect(() => {
    getShowTransliteration().then((stored) => {
      if (!touched.current) setShowState(stored);
    });
  }, []);

  const setShow = useCallback(async (next: boolean) => {
    touched.current = true;
    setShowState(next);
    await setShowTransliteration(next);
  }, []);

  const value = useMemo(() => ({ show, setShow }), [show, setShow]);
  return <TransliterationContext.Provider value={value}>{children}</TransliterationContext.Provider>;
}

/**
 * 転写を表示する場所はこの部品を通す。設定が off のときは何も描かない。
 * 「アルメニア文字が主役、転写は補助輪」という原則を、条件分岐の書き忘れで
 * 崩さないための入り口。
 */
export function Transliteration({ text, className }: { text: string; className?: string }) {
  const { show } = useTransliteration();
  if (!show) return null;
  return <span className={className}>{text}</span>;
}
