import { RewardsClient } from "@/components/RewardsClient";
import { KidRow } from "@/components/KidAvatar";

export default function RewardsPage() {
  return (
    <main className="page">
      <header className="mb-5">
        <span className="kicker">Step 6 · Prizes</span>
        <h1 className="h-display mt-2 text-4xl md:text-5xl">
          <span className="h-gradient">Reward shelf</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
          Spend FeatherPop earned from quests on real-world prizes. Parents
          activate rewards in person at events or at home.
        </p>
      </header>
      <section className="kid-stage mb-4">
        <KidRow kids={["bee", "lila", "mo", "ari"]} pose="jump" size={72} />
      </section>
      <RewardsClient />
    </main>
  );
}
