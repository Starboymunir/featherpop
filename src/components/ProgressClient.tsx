"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Egg,
  Feather,
  Gift,
  MapPin,
  Music,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import { useActiveChild } from "@/lib/use-active-child";
import { WORDS_TO_HATCH } from "@/lib/child-profile";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";
import { Medal } from "@/components/progress/Medal";
import { EggWidget } from "@/components/eggs/EggWidget";
import { getCard } from "@/lib/prize-library";

type MedalTier = "explorer" | "reader" | "finder" | "champion" | "golden";

interface BadgeMeta {
  threshold: number;
  name: string;
  tier: MedalTier;
}

const BADGES: BadgeMeta[] = [
  { threshold: 100,  name: "Word Explorer",  tier: "explorer" },
  { threshold: 250,  name: "Rising Reader",  tier: "reader" },
  { threshold: 500,  name: "Super Finder",   tier: "finder" },
  { threshold: 750,  name: "Word Champion",  tier: "champion" },
  { threshold: 1000, name: "Golden Feather", tier: "golden" },
];

const GOLDEN_FEATHER_GOAL = 1000;

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

export function ProgressClient() {
  const { progress, active } = useActiveChild();
  const wordsFound = progress.wordsFound ?? 0;
  const featherPop = progress.featherPop ?? 0;
  const eggsHatched = progress.hatched?.length ?? 0;
  const freeSpins = progress.freeSpins ?? 0;
  const videosWatched = progress.videosWatched ?? 0;
  const songsUnlocked = progress.songsUnlocked ?? 0;

  const mk = currentMonthKey();
  const inSameMonth = progress.monthKey === mk;
  const monthlyWords = inSameMonth ? progress.wordsThisMonth ?? 0 : 0;
  const earnedThisMonth = (progress.goldenFeatherMonths ?? []).includes(mk);

  const goldenPct = Math.min(100, Math.round((monthlyWords / GOLDEN_FEATHER_GOAL) * 100));
  const wordsToGo = Math.max(0, GOLDEN_FEATHER_GOAL - monthlyWords);

  return (
    <div className="progress-page-v2">
      <header className="progress-header-v2">
        <Link href="/" aria-label="Back" className="prizes-back-v2">
          <span aria-hidden>←</span>
        </Link>
        <div className="progress-header-mid-v2">
          <span className="prizes-eyebrow">
            <Sparkles aria-hidden className="h-4 w-4" />
            My Progress
          </span>
          <h1 className="progress-title-v2">
            {active ? `Keep flying, ${active.nickname}!` : "Keep flying!"}
          </h1>
          <p className="progress-subtitle-v2">
            Learn the <strong>Fly Way</strong> one feather at a time.
          </p>
        </div>
        <div className="progress-header-avatar-v2" aria-hidden>
          <MsFeatherPopAvatar pose="cheer" size={108} />
        </div>
      </header>

      {/* Egg widget — the kid's current egg + crack progress + link
          to the collection book of hatched friends. */}
      <EggWidget />

      <Link href="/collection-book" className="btn btn-gold btn-lg progress-view-creatures">
        🦩 View Hatched Creatures
        <ChevronRight aria-hidden className="h-5 w-5" />
      </Link>

      {/* Golden Feather hero stage */}
      <section className="progress-golden-v2">
        <div className="progress-golden-glow" aria-hidden />
        <div className="progress-golden-stage" aria-hidden>
          <GoldenFeatherIcon size={140} />
        </div>
        <div className="progress-golden-body-v2">
          <span className="progress-golden-eyebrow">
            <Sparkles aria-hidden className="h-3 w-3" />
            Golden Feather Progress
          </span>
          <p className="progress-golden-count-v2">
            <strong>{monthlyWords.toLocaleString()}</strong>
            <small>/ {GOLDEN_FEATHER_GOAL.toLocaleString()}</small>
          </p>
          <p className="progress-golden-label-v2">Words this month</p>
          <div className="progress-golden-bar-v2" role="progressbar" aria-valuemin={0} aria-valuemax={GOLDEN_FEATHER_GOAL} aria-valuenow={monthlyWords}>
            <span style={{ width: `${goldenPct}%` }}>
              <span className="progress-golden-bar-shine" aria-hidden />
            </span>
          </div>
          <p className="progress-golden-msg-v2">
            {earnedThisMonth ? (
              <>
                🎉 You earned the Golden Feather this month!{" "}
                <Link href="/print/golden-feather" className="progress-golden-link">
                  Print certificate →
                </Link>
              </>
            ) : wordsToGo === 0 ? (
              "🎉 You earned the Golden Feather!"
            ) : (
              <>
                <strong>{wordsToGo.toLocaleString()}</strong> words to the{" "}
                <strong className="progress-golden-msg-strong">Golden Feather!</strong>
              </>
            )}
          </p>
        </div>
      </section>

      {/* Stats grid — every tile is a tappable link to where the kid
          can earn more of that stat. */}
      <section className="progress-stats-v2">
        <StatCard
          icon={<BookOpen aria-hidden className="h-6 w-6" />}
          label="Words Found"
          value={wordsFound}
          tag={wordsFound > 0 ? "Play Letter Pop →" : "Find your first! →"}
          tone="purple"
          href="/play"
        />
        <StatCard
          icon={<Feather aria-hidden className="h-6 w-6" />}
          label="Feathers"
          value={featherPop}
          tag={featherPop > 100 ? "Spend on prizes →" : "Earn more →"}
          tone="blue"
          href="/rewards"
        />
        <StatCard
          icon={<Egg aria-hidden className="h-6 w-6" />}
          label="Eggs Hatched"
          value={eggsHatched}
          tag={eggsHatched > 0 ? "See your friends →" : `Read ${WORDS_TO_HATCH} words! →`}
          tone="green"
          href="/collection-book"
        />
        <StatCard
          icon={<Star aria-hidden className="h-6 w-6" />}
          label="Free Spins"
          value={freeSpins}
          tag={freeSpins > 0 ? "Spin the wheel →" : "Hatch to earn! →"}
          tone="pink"
          href="/spin"
        />
        <StatCard
          icon={<Video aria-hidden className="h-6 w-6" />}
          label="Videos Watched"
          value={videosWatched}
          tag="Watch a story →"
          tone="orange"
          href="/story"
        />
        <StatCard
          icon={<Music aria-hidden className="h-6 w-6" />}
          label="Songs Unlocked"
          value={songsUnlocked}
          tag="Sing along →"
          tone="teal"
          href="/music"
        />
      </section>

      {/* Badges row — medal-style. Earned badges link to /collection
          (the trophy wall); locked badges link to /play (where they
          can earn more words). */}
      <section className="progress-badges-v2">
        <header className="progress-badges-head">
          <span className="progress-badges-eyebrow">
            <Sparkles aria-hidden className="h-4 w-4" />
            Badges Earned
          </span>
          <h2>Your Trophy Wall</h2>
          <p>
            Find more words to unlock the next medal. The Golden Feather is the
            ultimate prize.
          </p>
        </header>
        <div className="progress-badges-row-v2">
          {BADGES.map((b) => {
            const earned = wordsFound >= b.threshold;
            const wordsToBadge = Math.max(0, b.threshold - wordsFound);
            return (
              <Link
                key={b.threshold}
                href={earned ? "/collection" : "/play"}
                className={`progress-badge-v2 tier-${b.tier} ${
                  earned ? "is-earned" : "is-locked"
                }`}
                aria-label={
                  earned
                    ? `${b.name} earned`
                    : `${b.name} locked, ${wordsToBadge} words to go`
                }
              >
                <Medal tier={b.tier} earned={earned} />
                <div className="progress-badge-meta">
                  <span className="progress-badge-count-v2">
                    {b.threshold.toLocaleString()} <small>words</small>
                  </span>
                  <span className="progress-badge-name-v2">{b.name}</span>
                  <span className="progress-badge-status">
                    {earned ? "Earned" : `${wordsToBadge.toLocaleString()} to go`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent activity — last hatches + last prize claims so the
          page shows actual movement, not just static totals. */}
      <RecentActivity />

      {/* Quick links row — explicit next-action prompts since this
          page used to be all numbers + no doors. */}
      <section className="progress-quick">
        <Link href="/play" className="progress-quick-link tone-purple">
          <BookOpen aria-hidden className="h-5 w-5" />
          <div>
            <strong>Play Letter Pop</strong>
            <small>Earn feathers + crack the egg</small>
          </div>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </Link>
        <Link href="/park-hunt" className="progress-quick-link tone-orange">
          <MapPin aria-hidden className="h-5 w-5" />
          <div>
            <strong>Park Hunt</strong>
            <small>Scan stations to find the word</small>
          </div>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </Link>
        <Link href="/rewards" className="progress-quick-link tone-pink">
          <Gift aria-hidden className="h-5 w-5" />
          <div>
            <strong>Spend feathers</strong>
            <small>Trade them for prizes</small>
          </div>
          <ChevronRight aria-hidden className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}

function RecentActivity() {
  const { progress } = useActiveChild();
  const hatched = (progress.hatched ?? []).slice(0, 3);
  const claims = (progress.claimedRewards ?? []).slice(0, 3);

  if (hatched.length === 0 && claims.length === 0) return null;

  return (
    <section className="progress-recent">
      <header className="progress-recent-head">
        <span className="progress-badges-eyebrow">
          <Sparkles aria-hidden className="h-4 w-4" />
          Recent activity
        </span>
        <h2>What you&apos;ve been up to</h2>
      </header>

      <div className="progress-recent-grid">
        {hatched.map((h) => (
          <article key={`hatch-${h.hatchedAt}`} className="progress-recent-item">
            <span className="progress-recent-emoji" aria-hidden>
              {hatchedEmojiFor(h.character)}
            </span>
            <div className="progress-recent-body">
              <strong>{prettyName(h.character)} hatched!</strong>
              <small>
                From a {h.color} egg · {h.wordsRead} words
              </small>
              <small className="progress-recent-time">
                {formatTimeAgo(h.hatchedAt)}
              </small>
            </div>
            <Link href="/collection-book" className="progress-recent-cta">
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          </article>
        ))}
        {claims.map((c) => (
          <article key={`claim-${c.at}`} className="progress-recent-item">
            <span className="progress-recent-emoji" aria-hidden>
              {claimEmojiFor(c)}
            </span>
            <div className="progress-recent-body">
              <strong>{claimTitleFor(c)}</strong>
              <small>−{c.cost} feathers</small>
              <small className="progress-recent-time">
                {formatTimeAgo(c.at)}
              </small>
            </div>
            <Link href={`/prize/${c.at}`} className="progress-recent-cta">
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function hatchedEmojiFor(c: string): string {
  const m: Record<string, string> = {
    "baby-eagle": "🦅",
    "baby-peacock": "🦚",
    "baby-bunny": "🐰",
    "baby-butterfly": "🦋",
    "rainbow-peacock": "🌈",
    "feather-dragon": "🐉",
    "sparkle-unicorn": "🦄",
    "golden-eagle": "👑",
  };
  return m[c] ?? "🥚";
}

function prettyName(c: string): string {
  return c.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface ClaimEntry {
  id: string;
  at: number;
  cost: number;
  variantId?: string;
  variantType?: string;
}

function claimEmojiFor(c: ClaimEntry): string {
  if (c.variantType === "card") {
    const card = c.variantId ? getCard(c.variantId) : undefined;
    return card?.emoji ?? "🃏";
  }
  if (c.variantType === "coloring") return "🎨";
  if (c.variantType === "puzzle") return "🧩";
  if (c.id === "mystery") return "🎁";
  if (c.id === "character") return "🃏";
  return "🎁";
}

function claimTitleFor(c: ClaimEntry): string {
  if (c.variantType === "card" && c.variantId) {
    const card = getCard(c.variantId);
    if (card) return `Pulled ${card.name}`;
  }
  if (c.variantType === "coloring") return "Coloring page unlocked";
  if (c.variantType === "puzzle") return "Puzzle unlocked";
  if (c.id === "mystery") return "Opened a Mystery Box";
  if (c.id === "character") return "Pulled a character card";
  return "Claimed a prize";
}

function formatTimeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tag: string;
  tone: "purple" | "blue" | "green" | "pink" | "orange" | "teal";
  href: string;
}

function StatCard({ icon, label, value, tag, tone, href }: StatCardProps) {
  return (
    <Link className={`progress-stat-card-v2 tone-${tone}`} href={href}>
      <div className="progress-stat-icon-v2">
        <span className="progress-stat-icon-halo" aria-hidden />
        {icon}
      </div>
      <span className="progress-stat-value-v2">{value.toLocaleString()}</span>
      <span className="progress-stat-label-v2">{label}</span>
      <span className="progress-stat-tag-v2">
        {tag}
      </span>
    </Link>
  );
}

function GoldenFeatherIcon({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 200 220" width={size} height={(size * 220) / 200} aria-hidden>
      <defs>
        <linearGradient id="pgf-feather" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff8b0" />
          <stop offset="0.5" stopColor="#ffd14a" />
          <stop offset="1" stopColor="#f0a900" />
        </linearGradient>
        <linearGradient id="pgf-shine" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0.7} />
          <stop offset="0.5" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <g transform="translate(100 28)">
        <path
          d="M 0 0 C 38 28, 48 64, 36 124 C 32 144, 18 158, 0 168 C -18 158, -32 144, -36 124 C -48 64, -38 28, 0 0 Z"
          fill="url(#pgf-feather)"
          stroke="#a86800"
          strokeWidth="2"
        />
        <path
          d="M 0 0 C 38 28, 48 64, 36 124 C 32 144, 18 158, 0 168 C -18 158, -32 144, -36 124 C -48 64, -38 28, 0 0 Z"
          fill="url(#pgf-shine)"
        />
        <path d="M 0 4 L 0 162" stroke="#a86800" strokeWidth="2" />
        {Array.from({ length: 9 }).map((_, i) => {
          const y = 18 + i * 16;
          return (
            <g key={i}>
              <path
                d={`M 0 ${y} Q -16 ${y + 6} -28 ${y + 16}`}
                stroke="#a86800"
                strokeWidth="1.2"
                fill="none"
                opacity={0.55}
              />
              <path
                d={`M 0 ${y} Q 16 ${y + 6} 28 ${y + 16}`}
                stroke="#a86800"
                strokeWidth="1.2"
                fill="none"
                opacity={0.55}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
