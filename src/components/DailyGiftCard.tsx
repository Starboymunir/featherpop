"use client";

// The Daily Gift — a once-a-day surprise on the home screen. It's the habit
// cue: a wrapped gift the kid opens each day to reveal a random reward. Shows
// nothing once opened for the day.

import { useState } from "react";
import { Feather, Sparkles } from "lucide-react";
import { useActiveChild } from "@/lib/use-active-child";
import { claimDailyGiftAction } from "@/lib/child-progress-actions";
import { childCheer, fanfare, pop } from "@/lib/audio";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
}

export function DailyGiftCard() {
  const { active, progress } = useActiveChild();
  const alreadyToday = (progress.dailyGiftDates ?? []).includes(todayKey());

  const [opening, setOpening] = useState(false);
  const [reward, setReward] = useState<{ featherPop: number; freeSpin: boolean } | null>(
    null,
  );
  const [hidden, setHidden] = useState(false);

  // Nothing to show if no child, already claimed today, or just dismissed.
  if (!active || hidden || (alreadyToday && !reward)) return null;

  async function open() {
    if (opening || reward) return;
    setOpening(true);
    pop();
    const res = await claimDailyGiftAction().catch(() => null);
    if (res && res.ok) {
      setReward({ featherPop: res.featherPop, freeSpin: res.freeSpin });
      fanfare();
      window.setTimeout(() => childCheer(), 600);
    } else {
      // Already opened elsewhere / no child — just hide.
      setHidden(true);
    }
    setOpening(false);
  }

  if (reward) {
    return (
      <div className="daily-gift is-open" role="status">
        <div className="daily-gift-burst" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
        <span className="daily-gift-icon" aria-hidden>🎉</span>
        <div className="daily-gift-body">
          <strong>Daily Gift opened!</strong>
          <span className="daily-gift-reward">
            <Feather aria-hidden className="h-4 w-4" />
            +{reward.featherPop} FeatherPop
            {reward.freeSpin ? " · +1 free spin!" : ""}
          </span>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setHidden(true)}
        >
          Yay!
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`daily-gift ${opening ? "is-opening" : ""}`}
      onClick={open}
      disabled={opening}
      aria-label="Open your Daily Gift"
    >
      <span className="daily-gift-icon daily-gift-wobble" aria-hidden>🎁</span>
      <div className="daily-gift-body">
        <span className="daily-gift-eyebrow">
          <Sparkles aria-hidden className="h-3 w-3" />
          Daily Gift
        </span>
        <strong>{opening ? "Opening…" : "Tap to open your surprise!"}</strong>
      </div>
      <span className="daily-gift-cta" aria-hidden>Open</span>
    </button>
  );
}
