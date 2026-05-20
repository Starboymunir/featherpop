import { Wordshake } from "@/components/Wordshake";

export const metadata = {
  title: "Word Shake · Side Game",
};

export default function PlayPage() {
  return (
    <main className="page">
      <header className="mb-4">
        <span className="kicker">Side game</span>
        <h1 className="h-display mt-2 text-3xl md:text-4xl">
          <span className="h-gradient">Word Shake</span>
        </h1>
        <p className="text-sm font-semibold text-[var(--ink-soft)]">
          Tap connected letters to build words. 2 minutes — every word earns
          points, and points become FeatherPop.
        </p>
      </header>
      <Wordshake />
    </main>
  );
}
