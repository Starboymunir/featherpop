import Link from "next/link";
import { ArrowRight, BookOpen, Camera, Gift, Lightbulb, Sparkles, Trophy } from "lucide-react";
import { KidAvatar, KidRow } from "@/components/KidAvatar";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";

const STEP_KIDS = ["ari", "bee", "kai", "lila", "mo", "zara"] as const;

const steps = [
  { title: "1. Scan", text: "Point the phone camera at a Word Quest QR code.", icon: Camera, color: "var(--sky-4)" },
  { title: "2. Discover", text: "A main letter pops out, with helper letters around it.", icon: Sparkles, color: "var(--gold)" },
  { title: "3. Build", text: "Tap the letter tiles in order to spell the target word.", icon: BookOpen, color: "var(--magenta)" },
  { title: "4. Hint", text: "Stuck? Tap the hint to see a friendly clue.", icon: Lightbulb, color: "var(--pink)" },
  { title: "5. Earn", text: "Each correct word adds FeatherPop to your wallet.", icon: Trophy, color: "var(--purple)" },
  { title: "6. Unlock", text: "Spend FeatherPop to unlock real-world rewards.", icon: Gift, color: "var(--mint)" },
];

export default function HowToPlayPage() {
  return (
    <main className="page">
      <header className="mb-6">
        <span className="kicker">Game guide</span>
        <h1 className="h-display mt-2 text-4xl md:text-5xl">
          <span className="h-gradient">How to play</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
          Six simple moves and you&apos;re a Word Quest champion. Designed for
          kids ages 3–11, with grown-up supervision for younger players.
        </p>
      </header>

      <section className="kid-stage mb-6">
        <KidRow pose="wave" size={70} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const kid = STEP_KIDS[i % STEP_KIDS.length];
          return (
            <article key={s.title} className="card">
              <div className="flex items-center gap-3">
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-white"
                  style={{ background: s.color }}
                >
                  <Icon aria-hidden className="h-6 w-6" />
                </div>
                <KidAvatar kid={kid} pose={i % 2 === 0 ? "wave" : "cheer"} size={56} />
              </div>
              <h2 className="h-display mt-4 text-2xl">{s.title}</h2>
              <p className="mt-1 text-[var(--ink-soft)]">{s.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-8 card card-deep">
        <div className="flex items-center gap-3">
          <MsFeatherPopAvatar pose="hint" size={120} />
          <div>
            <h2 className="h-display text-2xl">Tips from Ms. Feather Pop</h2>
            <p className="mt-1 text-white/70 text-sm">
              For grown-ups helping out.
            </p>
          </div>
        </div>
        <ul className="mt-4 grid gap-2 text-white/85">
          <li>· Hold the phone steady — keep the QR inside the bright frame.</li>
          <li>· Encourage kids to say each letter out loud as they tap.</li>
          <li>· Need new challenges? Print a quest pack from the Print page.</li>
        </ul>
        <Link href="/scan" className="btn btn-gold mt-5 self-start">
          Open Scanner
          <ArrowRight aria-hidden className="h-5 w-5" />
        </Link>
      </section>
    </main>
  );
}
