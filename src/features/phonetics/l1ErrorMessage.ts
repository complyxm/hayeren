/** WebSpeechRecognitionAdapter が reject する Error.message(SpeechRecognitionErrorCode 等)を日本語化する。 */
export function l1ErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "マイクへのアクセスが許可されませんでした。";
    case "no-speech":
      return "音声が検出されませんでした。もう一度お試しください。";
    case "language-not-supported":
      return "このブラウザは hy-AM の音声認識に対応していません。";
    case "network":
      return "ネットワークエラーが発生しました。しばらくしてからもう一度お試しください。";
    case "audio-capture":
      return "マイクを利用できませんでした。";
    case "timeout":
      return "認識がタイムアウトしました。もう一度お試しください。";
    default:
      return "音声認識でエラーが発生しました。もう一度お試しください。";
  }
}
