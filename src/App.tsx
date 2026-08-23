import { appShell } from "./data/appShell";

export function App() {
  const { greeting } = appShell;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1c1410] px-6 text-center text-[#f3e9d8]">
      <h1
        lang="hy"
        className="font-serif text-5xl font-bold tracking-wide sm:text-6xl"
      >
        {greeting.text}
      </h1>
      <p className="font-sans text-lg text-[#f3e9d8]/80">
        {greeting.translation}
      </p>
    </main>
  );
}
