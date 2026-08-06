"use client";

// Persistent egg display — drops into the home page + /progress.
// Shows the current egg's color, its progressive crack level
// (derived from wordsFound vs egg.wordsAtStart), and a progress
// bar to the next hatch milestone.
//
// Tapping it routes to /collection-book so the kid can see all the
// friends they've already hatched.

import Link from "next/link";
import { useActiveChild } from "@/lib/use-active-child";
import {
  WORDS_TO_HATCH,
  crackThresholdsFor,
  type EggColor,
} from "@/lib/child-profile";
import { EggSvg } from "@/components/eggs/EggSvg";
import { Sparkles } from "lucide-react";

export function EggWidget({ compact = false }: { compact?: boolean }) {
  const { progress } = useActiveChild();
  const wordsFound = progress.wordsFound ?? 0;
  const egg = progress.egg;
  const eggColor: EggColor = egg?.color ?? "purple";
  const wordsAtStart = egg?.wordsAtStart ?? 0;
  // This egg's own hatch total (the first egg is cheaper).
  const total = egg?.wordsToHatch ?? WORDS_TO_HATCH;
  const thresholds = crackThresholdsFor(total);
  const wordsInEgg = Math.min(total, Math.max(0, wordsFound - wordsAtStart));
  // crack level 0..4 based on milestones crossed
  let crackLevel = 0;
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (wordsInEgg >= thresholds[i]) crackLevel = i + 1;
  }

  const wordsToGo = Math.max(0, total - wordsInEgg);
  const pct = Math.round((wordsInEgg / total) * 100);
  const hatchedCount = progress.hatched?.length ?? 0;

  return (
    <Link
      href="/collection-book"
      className={`egg-widget ${compact ? "is-compact" : ""}`}
      aria-label="Your magical egg"
    >
      <div className="egg-widget-art" aria-hidden>
        <EggSvg color={eggColor} crackLevel={crackLevel} size={compact ? 110 : 150} />
      </div>
      <div className="egg-widget-body">
        <span className="egg-widget-eyebrow">
          <Sparkles aria-hidden className="h-3 w-3" />
          Your magical egg
        </span>
        <p className="egg-widget-color">
          {eggColor.charAt(0).toUpperCase() + eggColor.slice(1)} Egg
        </p>
        <div className="egg-widget-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={wordsInEgg}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="egg-widget-progress">
          <strong>{wordsInEgg}</strong> / {total} words
          {wordsToGo > 0 ? <span className="egg-widget-togo"> · {wordsToGo} to hatch</span> : null}
        </p>
        {hatchedCount > 0 ? (
          <p className="egg-widget-meta">
            <strong>{hatchedCount}</strong> magical friend
            {hatchedCount === 1 ? "" : "s"} hatched
          </p>
        ) : null}
        <span className="egg-widget-cta">
          🦩 View hatched creatures →
        </span>
      </div>
    </Link>
  );
}
