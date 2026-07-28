// Explorer Level — the progression spine. Based on total wordsFound (which
// only ever goes up, unlike spendable feathers), so the number always climbs
// and gives kids visible mastery + a reason to come back "one more level."
//
// Curve: words to REACH level L = 5 * L * (L-1)
//   L1 = 0, L2 = 10, L3 = 30, L4 = 60, L5 = 100, L6 = 150, L7 = 210 ...
// Gentle early (fast first level-ups = hook), gradually steeper, uncapped.

export function wordsForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return 5 * L * (L - 1);
}

export function explorerLevel(wordsFound: number): number {
  const w = Math.max(0, wordsFound);
  // Invert 5*L*(L-1) <= w  →  L = floor((1 + sqrt(1 + 4w/5)) / 2)
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * w) / 5)) / 2));
}

export interface LevelProgress {
  level: number;
  into: number; // words into the current level
  need: number; // words needed to finish the current level
  pct: number; // 0..100
  title: string;
}

export function levelProgress(wordsFound: number): LevelProgress {
  const level = explorerLevel(wordsFound);
  const base = wordsForLevel(level);
  const next = wordsForLevel(level + 1);
  const into = Math.max(0, wordsFound - base);
  const need = Math.max(1, next - base);
  return {
    level,
    into,
    need,
    pct: Math.min(100, Math.round((into / need) * 100)),
    title: levelTitle(level),
  };
}

/** Fun escalating rank titles. */
export function levelTitle(level: number): string {
  if (level <= 1) return "Baby Bird";
  if (level <= 3) return "Fledgling Flyer";
  if (level <= 5) return "Feather Finder";
  if (level <= 8) return "Sky Explorer";
  if (level <= 12) return "Falcon Flyer";
  if (level <= 18) return "Star Voyager";
  return "Guardian of Strudelay";
}
