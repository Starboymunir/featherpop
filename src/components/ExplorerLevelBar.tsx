"use client";

// The Explorer Level badge + XP-to-next bar. The always-visible progression
// signal — a number that climbs as the child reads words.

import Link from "next/link";
import { useActiveChild } from "@/lib/use-active-child";
import { levelProgress } from "@/lib/explorer-level";

export function ExplorerLevelBar({ href = "/progress" }: { href?: string }) {
  const { progress } = useActiveChild();
  const { level, into, need, pct, title } = levelProgress(progress.wordsFound ?? 0);

  return (
    <Link href={href} className="xp-bar" aria-label={`Explorer level ${level}, ${title}`}>
      <span className="xp-badge" aria-hidden>
        {level}
      </span>
      <span className="xp-body">
        <span className="xp-head">
          <strong>Level {level}</strong>
          <span className="xp-title">{title}</span>
        </span>
        <span className="xp-track" aria-hidden>
          <span className="xp-fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="xp-count">
          {into} / {need} words to level {level + 1}
        </span>
      </span>
    </Link>
  );
}
