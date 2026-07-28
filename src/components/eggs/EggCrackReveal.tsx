"use client";

// Celebration overlay shown when a child crosses a NEW crack milestone
// (10/20/30/40 words past the egg start). Plays cracking SFX +
// sparkles + Ms. Feather Pop's encouragement.
//
// Hatch (50 words) is handled by EggHatchReveal — that takes over the
// celebration so we never show both at once.

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { WORDS_TO_HATCH, type EggColor } from "@/lib/child-profile";
import { Confetti } from "@/components/Confetti";
import { eggCrack, fanfare, pop, wordReveal } from "@/lib/audio";
import { EggSvg } from "@/components/eggs/EggSvg";

export function EggCrackReveal({
  level,
  label,
  message,
  color,
  wordsInEgg,
  wordsToHatch = WORDS_TO_HATCH,
  onClose,
}: {
  level: number;
  label: string;
  message: string;
  color: EggColor;
  wordsInEgg: number;
  wordsToHatch?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    pop();
    window.setTimeout(() => eggCrack(), 150);
    window.setTimeout(() => wordReveal(), 700);
    if (level >= 3) {
      // Almost-open milestone gets a bigger reaction.
      window.setTimeout(() => fanfare(), 1100);
    }
    // Auto-dismiss after 3.5s so the kid isn't trapped — celebration
    // is meant to be a brief moment of delight, not a modal block.
    const t = window.setTimeout(() => onClose(), 3500);
    return () => window.clearTimeout(t);
  }, [level, onClose]);

  // Crack level for the egg art = the level we just crossed (0..3) + 1.
  // (level here is the 0..4 index from CRACK_LABELS; 4 = hatch handled
  // elsewhere, so we clamp to 4 for the art.)
  const crackArtLevel = Math.min(4, level + 1);

  return (
    <div className="egg-crack-overlay" role="dialog" aria-labelledby="egg-crack-title">
      <Confetti trigger={Date.now()} pieces={50} />
      <div className="egg-crack-card">
        <button
          type="button"
          className="egg-crack-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>

        <span className="egg-crack-eyebrow">
          <Sparkles aria-hidden className="h-4 w-4" />
          {label.toUpperCase()}
        </span>

        <div className="egg-crack-stage">
          <span className="egg-crack-stage-halo" aria-hidden />
          <EggSvg color={color} crackLevel={crackArtLevel} size={180} hovering />
        </div>

        <h2 id="egg-crack-title" className="egg-crack-title">
          {message}
        </h2>

        <p className="egg-crack-progress">
          <strong>{wordsInEgg}</strong> / {wordsToHatch} words to hatch
        </p>

        <div className="egg-crack-progress-bar" aria-hidden>
          <span style={{ width: `${(wordsInEgg / wordsToHatch) * 100}%` }} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-gold btn-lg btn-pulse egg-crack-cta"
        >
          Keep reading!
        </button>
      </div>
    </div>
  );
}
