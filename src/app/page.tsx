import Link from "next/link";
import { BookOpen, Camera, Gamepad2, Gift, Printer, Sparkles } from "lucide-react";
import { StartQuest } from "@/components/StartQuest";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";
import { KidRow } from "@/components/KidAvatar";

const features = [
  {
    title: "Scan",
    text: "Point the camera at a Word Quest QR code.",
    icon: Camera,
    color: "var(--sky-4)",
  },
  {
    title: "Discover",
    text: "Letters appear with a magic pop animation.",
    icon: Sparkles,
    color: "var(--gold)",
  },
  {
    title: "Build",
    text: "Tap big letter tiles to spell the mystery word.",
    icon: BookOpen,
    color: "var(--magenta)",
  },
  {
    title: "Win",
    text: "Earn FeatherPop and unlock real-world rewards.",
    icon: Gift,
    color: "var(--mint)",
  },
];

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div className="float-letters" aria-hidden>
          <span className="float-letter" style={{ top: "8%", left: "6%" }}>A</span>
          <span className="float-letter" style={{ top: "65%", left: "12%" }}>B</span>
          <span className="float-letter" style={{ top: "18%", right: "10%" }}>C</span>
          <span className="float-letter" style={{ top: "70%", right: "6%" }}>!</span>
          <span className="float-letter" style={{ top: "40%", left: "2%" }}>★</span>
          <span className="float-letter" style={{ top: "35%", right: "3%" }}>✦</span>
          <span className="float-letter" style={{ top: "55%", left: "45%" }}>?</span>
        </div>

        <div className="hero-grid">
          <div>
            <span className="kicker">
              <Sparkles aria-hidden className="h-4 w-4" />
              QR-powered literacy adventure
            </span>
            <h1 className="h-display hero-title mt-4">
              <span className="h-gradient">Word</span>
              <br />
              <span className="h-stroke">Quest</span>
            </h1>
            <p className="hero-subtitle">
              Scan, discover letters, make words, earn{" "}
              <strong style={{ color: "var(--magenta)" }}>FeatherPop</strong>,
              and unlock prizes — at the park or right at home.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <StartQuest />
              <Link href="/play" className="btn btn-sky">
                <Gamepad2 aria-hidden className="h-5 w-5" />
                Play Word Shake
              </Link>
              <Link href="/how-to-play" className="btn btn-ghost">
                How to Play
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--ink-soft)]">
              <span>· Made for ages 3–11</span>
              <span>· Mobile-first</span>
              <span>· No sign-up required</span>
            </div>
          </div>

          <div className="hero-portrait">
            <div className="fp-stage">
              <MsFeatherPopAvatar pose="wave" size={300} />
            </div>
          </div>
        </div>
      </section>

      <section className="kid-stage mt-6">
        <KidRow pose="cheer" size={86} />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="h-display text-3xl">How a quest works</h2>
          <Link
            href="/how-to-play"
            className="text-sm font-bold text-[var(--purple)]"
          >
            Read more →
          </Link>
        </div>
        <div className="feature-row">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="feature-pill">
                <div
                  className="icon-bubble"
                  style={{ background: f.color }}
                >
                  <Icon aria-hidden className="h-5 w-5" />
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="card">
          <span className="kicker" style={{ color: "var(--pink)" }}>
            For kids
          </span>
          <h3 className="h-display mt-3 text-2xl">Active learning, big fun</h3>
          <p className="mt-2 text-[var(--ink-soft)]">
            Every QR is a mini quest. Hunt them around the park, discover a
            secret letter, build the target word, and celebrate with cheers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/scan" className="btn btn-sky btn-sm">
              <Camera aria-hidden className="h-4 w-4" />
              Open Scanner
            </Link>
            <Link href="/wallet" className="btn btn-ghost btn-sm">
              View Wallet
            </Link>
          </div>
        </div>

        <div className="card card-deep">
          <span
            className="kicker"
            style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
          >
            For parents
          </span>
          <h3 className="h-display mt-3 text-2xl">Print quest packs at home</h3>
          <p className="mt-2 text-white/80">
            Print a sheet of QR cards, place them around the room, and watch
            your child move, read and spell. No accounts, no ads.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/print" className="btn btn-gold btn-sm">
              <Printer aria-hidden className="h-4 w-4" />
              Get Print Pack
            </Link>
            <Link href="/rewards" className="btn btn-ghost btn-sm">
              See Rewards
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
