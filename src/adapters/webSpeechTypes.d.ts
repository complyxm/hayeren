/**
 * TypeScript の lib.dom.d.ts には SpeechRecognitionResult 等の型はあるが、
 * SpeechRecognition 本体（コンストラクタ）の型は含まれていない
 * （非標準 API のため。Chrome は window.webkitSpeechRecognition に実装を持つ）。
 * ここで実際に使う部分だけ最小限に宣言する。
 */
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
