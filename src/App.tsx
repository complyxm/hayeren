import { useState } from "react";
import { AlphabetList } from "./features/alphabet/AlphabetList";
import { AlphabetDetail } from "./features/alphabet/AlphabetDetail";
import { PunctuationCards } from "./features/punctuation/PunctuationCards";
import { ArmenianKeyboard } from "./features/keyboard/ArmenianKeyboard";
import { MetroNav } from "./features/metro/MetroNav";
import { ReviewScreen } from "./features/review/ReviewScreen";
import { VotPractice } from "./features/phonetics/VotPractice";
import { VowelPractice } from "./features/phonetics/VowelPractice";
import { L1RecognitionPractice } from "./features/phonetics/L1RecognitionPractice";
import { VocabList } from "./features/vocab/VocabList";
import { VocabDetail } from "./features/vocab/VocabDetail";
import { VocabReviewScreen } from "./features/vocab/VocabReviewScreen";
import { GrammarList } from "./features/grammar/GrammarList";
import { GrammarLesson } from "./features/grammar/GrammarLesson";
import { ConjugationMachine } from "./features/grammar/ConjugationMachine";
import { SentenceTiles } from "./features/grammar/SentenceTiles";
import { GrammarReviewScreen } from "./features/grammar/GrammarReviewScreen";
import { ScenarioMeter } from "./features/scenarios/ScenarioMeter";
import { ScenarioDialogue } from "./features/scenarios/ScenarioDialogue";
import { ReleaseNotes } from "./features/about/ReleaseNotes";
import { SignReading } from "./features/signs/SignReading";
import { ListeningChallenge } from "./features/phonetics/ListeningChallenge";
import { Credits } from "./features/about/Credits";
import { RussianPhrases } from "./features/russian/RussianPhrases";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { TransliterationProvider } from "./features/settings/transliteration";
import { Dashboard } from "./features/home/Dashboard";
import { BrowseMenu } from "./features/home/BrowseMenu";

type Screen =
  | { name: "home" }
  | { name: "alphabet-list" }
  | { name: "alphabet-detail"; id: string }
  | { name: "punctuation" }
  | { name: "keyboard" }
  | { name: "metro" }
  | { name: "review" }
  | { name: "vot-practice" }
  | { name: "vowel-practice" }
  | { name: "l1-practice" }
  | { name: "vocab-list" }
  | { name: "vocab-detail"; id: string }
  | { name: "vocab-review" }
  | { name: "grammar-list" }
  | { name: "grammar-lesson"; id: string }
  | { name: "conjugation-machine" }
  | { name: "sentence-tiles" }
  | { name: "grammar-review" }
  | { name: "scenario-meter" }
  | { name: "scenario-dialogue"; id: string }
  | { name: "release-notes" }
  | { name: "sign-reading" }
  | { name: "russian" }
  | { name: "settings" }
  | { name: "browse" }
  | { name: "listening" }
  | { name: "credits" };

const HOME: Screen = { name: "home" };

export function App() {
  return (
    <TransliterationProvider>
      <Router />
    </TransliterationProvider>
  );
}

/** 画面遷移だけを持つ内側。転写設定の Provider をアプリ全体に掛けるために分けてある。 */
function Router() {
  const [screen, setScreen] = useState<Screen>(HOME);

  switch (screen.name) {
    case "alphabet-list":
      return (
        <AlphabetList
          onBack={() => setScreen(HOME)}
          onSelect={(id) => setScreen({ name: "alphabet-detail", id })}
        />
      );
    case "alphabet-detail":
      return (
        <AlphabetDetail
          id={screen.id}
          onBack={() => setScreen({ name: "alphabet-list" })}
          onSelect={(id) => setScreen({ name: "alphabet-detail", id })}
        />
      );
    case "punctuation":
      return <PunctuationCards onBack={() => setScreen(HOME)} />;
    case "keyboard":
      return <ArmenianKeyboard onBack={() => setScreen(HOME)} />;
    case "metro":
      return <MetroNav onBack={() => setScreen(HOME)} />;
    case "review":
      return <ReviewScreen onBack={() => setScreen(HOME)} />;
    case "vot-practice":
      return <VotPractice onBack={() => setScreen(HOME)} />;
    case "vowel-practice":
      return <VowelPractice onBack={() => setScreen(HOME)} />;
    case "l1-practice":
      return <L1RecognitionPractice onBack={() => setScreen(HOME)} />;
    case "vocab-list":
      return (
        <VocabList onBack={() => setScreen(HOME)} onSelect={(id) => setScreen({ name: "vocab-detail", id })} />
      );
    case "vocab-detail":
      return <VocabDetail id={screen.id} onBack={() => setScreen({ name: "vocab-list" })} />;
    case "vocab-review":
      return <VocabReviewScreen onBack={() => setScreen(HOME)} />;
    case "grammar-list":
      return (
        <GrammarList onBack={() => setScreen(HOME)} onSelect={(id) => setScreen({ name: "grammar-lesson", id })} />
      );
    case "grammar-lesson":
      return <GrammarLesson id={screen.id} onBack={() => setScreen({ name: "grammar-list" })} />;
    case "conjugation-machine":
      return <ConjugationMachine onBack={() => setScreen(HOME)} />;
    case "sentence-tiles":
      return <SentenceTiles onBack={() => setScreen(HOME)} />;
    case "grammar-review":
      return <GrammarReviewScreen onBack={() => setScreen(HOME)} />;
    case "scenario-meter":
      return (
        <ScenarioMeter
          onBack={() => setScreen(HOME)}
          onSelect={(id) => setScreen({ name: "scenario-dialogue", id })}
        />
      );
    case "scenario-dialogue":
      return <ScenarioDialogue id={screen.id} onBack={() => setScreen({ name: "scenario-meter" })} />;
    case "release-notes":
      return <ReleaseNotes onBack={() => setScreen(HOME)} />;
    case "sign-reading":
      return <SignReading onBack={() => setScreen(HOME)} />;
    case "listening":
      return (
        <ListeningChallenge onBack={() => setScreen(HOME)} onCredits={() => setScreen({ name: "credits" })} />
      );
    case "credits":
      return <Credits onBack={() => setScreen(HOME)} />;
    case "russian":
      return <RussianPhrases onBack={() => setScreen(HOME)} />;
    case "settings":
      return <SettingsScreen onBack={() => setScreen(HOME)} />;
    case "browse":
      return (
        <BrowseMenu
          onBack={() => setScreen(HOME)}
          items={[
            { label: "文字表", hint: "38字 + ու + և。筆順となぞり書き", go: () => setScreen({ name: "alphabet-list" }) },
            { label: "語彙", hint: "14テーマ・501語", go: () => setScreen({ name: "vocab-list" }) },
            { label: "文法", hint: "24課", go: () => setScreen({ name: "grammar-list" }) },
            { label: "活用マシン", hint: "動詞の形を眺める。採点なし", go: () => setScreen({ name: "conjugation-machine" }) },
            { label: "文タイル", hint: "肯定を否定に組み替える", go: () => setScreen({ name: "sentence-tiles" }) },
            { label: "句読点", hint: "։ ՞ ՜ ՛ ՝ の使い分け", go: () => setScreen({ name: "punctuation" }) },
            { label: "画面内キーボード", go: () => setScreen({ name: "keyboard" }) },
            { label: "エレバン地下鉄ナビ", go: () => setScreen({ name: "metro" }) },
            { label: "聞き分け", hint: "պ/փ と ռ/ր を耳で分ける。発音練習より先に", go: () => setScreen({ name: "listening" }) },
            { label: "発音チェック", hint: "破裂音の三系列を録音して測る", go: () => setScreen({ name: "vot-practice" }) },
            {
              label: "母音の位置",
              hint: "6つの母音を録音して四辺形に並べる",
              go: () => setScreen({ name: "vowel-practice" }),
            },
            { label: "音声認識で読み確認", hint: "実験的。既定オフ", go: () => setScreen({ name: "l1-practice" }) },
          ]}
        />
      );
    default:
      return (
        <Dashboard
          onGo={{
            letters: () => setScreen({ name: "review" }),
            vocab: () => setScreen({ name: "vocab-review" }),
            grammar: () => setScreen({ name: "grammar-review" }),
            signs: () => setScreen({ name: "sign-reading" }),
            russian: () => setScreen({ name: "russian" }),
            scenarios: () => setScreen({ name: "scenario-meter" }),
            browse: () => setScreen({ name: "browse" }),
            settings: () => setScreen({ name: "settings" }),
            releaseNotes: () => setScreen({ name: "release-notes" }),
            credits: () => setScreen({ name: "credits" }),
          }}
        />
      );
  }
}
