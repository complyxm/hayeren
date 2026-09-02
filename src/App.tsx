import { useState } from "react";
import { appShell } from "./data/appShell";
import { AlphabetList } from "./features/alphabet/AlphabetList";
import { AlphabetDetail } from "./features/alphabet/AlphabetDetail";
import { PunctuationCards } from "./features/punctuation/PunctuationCards";
import { ArmenianKeyboard } from "./features/keyboard/ArmenianKeyboard";
import { MetroNav } from "./features/metro/MetroNav";
import { ReviewScreen } from "./features/review/ReviewScreen";
import { VotPractice } from "./features/phonetics/VotPractice";
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

type Screen =
  | { name: "home" }
  | { name: "alphabet-list" }
  | { name: "alphabet-detail"; id: string }
  | { name: "punctuation" }
  | { name: "keyboard" }
  | { name: "metro" }
  | { name: "review" }
  | { name: "vot-practice" }
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
  | { name: "scenario-dialogue"; id: string };

const HOME: Screen = { name: "home" };

function HomeMenu({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { greeting } = appShell;
  const items: { label: string; screen: Screen }[] = [
    { label: "今日の復習", screen: { name: "review" } },
    { label: "語彙の復習", screen: { name: "vocab-review" } },
    { label: "文法の復習", screen: { name: "grammar-review" } },
    { label: "文字表", screen: { name: "alphabet-list" } },
    { label: "語彙", screen: { name: "vocab-list" } },
    { label: "文法", screen: { name: "grammar-list" } },
    { label: "活用マシン", screen: { name: "conjugation-machine" } },
    { label: "文タイル", screen: { name: "sentence-tiles" } },
    { label: "エレバンモード", screen: { name: "scenario-meter" } },
    { label: "句読点", screen: { name: "punctuation" } },
    { label: "画面内キーボード", screen: { name: "keyboard" } },
    { label: "エレバン地下鉄ナビ", screen: { name: "metro" } },
    { label: "発音チェック（VOT）", screen: { name: "vot-practice" } },
    { label: "音声認識で読み確認（実験的）", screen: { name: "l1-practice" } },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-parchment px-6 py-12 text-center text-ink">
      <div>
        <h1 lang="hy" className="font-serif text-5xl font-bold tracking-wide sm:text-6xl">
          {greeting.text}
        </h1>
        <p className="mt-2 font-sans text-lg text-ink/80">{greeting.translation}</p>
      </div>
      <nav className="grid w-full max-w-sm gap-3">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.screen)}
            className="rounded-lg border border-gold/40 bg-parchment-light px-4 py-3 text-left text-ink transition hover:border-gold hover:bg-parchment-light/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
          >
            {item.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

export function App() {
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
    default:
      return <HomeMenu onNavigate={setScreen} />;
  }
}
