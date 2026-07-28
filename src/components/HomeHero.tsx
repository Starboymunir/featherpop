"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { useActiveChild } from "@/lib/use-active-child";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";
import { DailyGiftCard } from "@/components/DailyGiftCard";
import { ExplorerLevelBar } from "@/components/ExplorerLevelBar";
import {
  isMusicEnabled,
  pop,
  setMusicEnabled,
  startMusic,
  unlockVoiceClips,
} from "@/lib/audio";

function greetingForTime(): { greeting: string; pose: "wave" | "cheer" | "idle" } {
  const h = new Date().getHours();
  if (h < 12) return { greeting: "Good morning", pose: "wave" };
  if (h < 17) return { greeting: "Hey there", pose: "cheer" };
  return { greeting: "Good evening", pose: "idle" };
}

export function HomeHero() {
  const router = useRouter();
  const { active } = useActiveChild();
  const [greet] = useState<{ greeting: string; pose: "wave" | "cheer" | "idle" }>(() => greetingForTime());

  function handlePlay() {
    pop();
    // This tap is the user gesture that:
    //   1. Unlocks the WebAudio context (used for synthesized SFX).
    //   2. Primes the HTMLAudio voice clips so iOS Safari will allow
    //      them to play later from non-gesture handlers.
    //   3. Starts the procedural music loop.
    if (!isMusicEnabled()) setMusicEnabled(true);
    unlockVoiceClips();
    startMusic();
    router.push("/sort");
  }

  // Pre-warm the sort assets the moment the home page renders so the bird
  // and spider are in the browser cache when the child reaches them, not
  // a fresh network fetch in the middle of the celebration.
  useEffect(() => {
    const preload = [
      "/media/sort/bg-sort.png",
      "/media/sort/bird-fly.png",
      "/media/sort/bird-fly-frames.png",
      "/media/sort/banner-parchment.png",
      "/media/sort/spider-creep.png",
      "/media/sort/spider-eating.png",
      ...["falcon", "courage", "wind", "confidence", "wisdom", "joy"].flatMap((t) => [
        `/media/sort/feather-${t}.png`,
        `/media/sort/nest-${t}.png`,
      ]),
    ];
    preload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <section className="hero-home">
      <div className="hero-home-top">
        <span className="kicker">
          <Sparkles aria-hidden className="h-4 w-4" />
          {greet.greeting}
          {active ? `, ${active.nickname}` : ""}
        </span>
        <h1 className="h-display hero-title mt-2">
          <span className="h-gradient">Ms. Feather Pop</span>
          <br />
          <span className="h-stroke">Adventures</span>
        </h1>

        <div className="hero-home-mascot">
          <MsFeatherPopAvatar pose={greet.pose} size={120} />
        </div>
      </div>

      <ExplorerLevelBar />

      <DailyGiftCard />

      <button
        type="button"
        onClick={handlePlay}
        className="play-button"
        aria-label="Play"
      >
        <span className="play-button-ring" aria-hidden />
        <span className="play-button-ring play-button-ring-2" aria-hidden />
        <span className="play-button-icon">
          <Play aria-hidden className="h-12 w-12 fill-current" />
        </span>
        <span className="play-button-text">PLAY</span>
      </button>

      <div className="home-secondary-links">
        <Link href="/progress" className="home-secondary-link">
          <span aria-hidden>📊</span> My Progress
        </Link>
        <Link href="/membership" className="home-secondary-link is-gold">
          <span aria-hidden>👑</span> Membership
        </Link>
      </div>
    </section>
  );
}
