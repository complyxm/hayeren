import { useState } from "react";
import { appShell } from "./data/appShell";
import { AlphabetList } from "./features/alphabet/AlphabetList";
import { AlphabetDetail } from "./features/alphabet/AlphabetDetail";
import { PunctuationCards } from "./features/punctuation/PunctuationCards";
import { ArmenianKeyboard } from "./features/keyboard/ArmenianKeyboard";
import { MetroNav } from "./features/metro/MetroNav";
import { ReviewScreen } from "./features/review/ReviewScreen";

type Screen =
  | { name: "home" }
  | { name: "alphabet-list" }
  | { name: "alphabet-detail"; id: string }
  | { name: "punctuation" }
  | { name: "keyboard" }
  | { name: "metro" }
  | { name: "review" };

const HOME: Screen = { name: "home" };

function HomeMenu({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { greeting } = appShell;
  const items: { label: string; screen: Screen }[] = [
    { label: "今日の復習", screen: { name: "review" } },
    { label: "文字表", screen: { name: "alphabet-list" } },
    { label: "句読点", screen: { name: "punctuation" } },
    { label: "画面内キーボード", screen: { name: "keyboard" } },
    { label: "エレバン地下鉄ナビ", screen: { name: "metro" } },
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
    default:
      return <HomeMenu onNavigate={setScreen} />;
  }
}
