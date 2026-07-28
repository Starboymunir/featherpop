"use client";

// Celebration when the child reaches a new Explorer Level. Progression is the
// mastery signal that makes kids want "one more level."

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { childCheer, fanfare, pop, wordReveal } from "@/lib/audio";
import { levelTitle } from "@/lib/explorer-level";

export function LevelUpReveal({
  level,
  onClose,
}: {
  level: number;
  onClose: () => void;
}) {
  useEffect(() => {
    pop();
    const t1 = window.setTimeout(() => wordReveal(), 200);
    const t2 = window.setTimeout(() => fanfare(), 700);
    const t3 = window.setTimeout(() => childCheer(), 1600);
    return () => [t1, t2, t3].forEach(window.clearTimeout);
  }, []);

  return (
    <div className="levelup" role="dialog" aria-labelledby="levelup-title">
      <Confetti trigger={Date.now()} pieces={100} />
      <div className="levelup-rays" aria-hidden />
      <div className="levelup-card">
        <button
          type="button"
          className="levelup-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>
        <p className="levelup-kicker">
          <Sparkles aria-hidden className="h-4 w-4" />
          LEVEL UP!
        </p>
        <div className="levelup-badge" aria-hidden>
          <span className="levelup-badge-num">{level}</span>
        </div>
        <h2 id="levelup-title" className="levelup-title">
          Level {level}
        </h2>
        <p className="levelup-rank">{levelTitle(level)}</p>
        <p className="levelup-tag">You&apos;re getting stronger — keep reading!</p>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-gold btn-lg btn-pulse"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}
