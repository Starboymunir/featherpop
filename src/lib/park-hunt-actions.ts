"use server";

// Per-child Park Hunt state. Today's target word + station are stored in
// Clerk privateMetadata.parkHunt[childId] so the kid keeps their target
// across page reloads and devices, but each child still gets an
// independent session.

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getActiveChildId } from "@/lib/active-child-server";
import {
  STATION_COUNT,
  dailyStations,
  nextTargetForChild,
  stationOfWord,
  todayKey,
  weekKey,
} from "@/lib/park-hunt";
import { recordWordsFoundAction } from "@/lib/child-progress-actions";
import { getGlobalWordBank } from "@/lib/global-content";
import { tryConsumePlay } from "@/lib/play-limits";

interface StoredTarget {
  date: string;
  word: string;
  stationId: number;
  // Number of words the child has correctly found TODAY (used to award
  // the once-per-day video/music bonus and to track daily progress
  // without polluting featherPop).
  foundToday?: number;
  // Legacy: wrong-scan counter (no longer used now that scanning the right
  // QR is an instant pass and wrong scans simply say "try another").
  wrongScans?: number;
}

type ParkHuntMap = Record<string, StoredTarget>;

function readMap(meta: unknown): ParkHuntMap {
  if (!meta || typeof meta !== "object") return {};
  const v = (meta as Record<string, unknown>).parkHunt;
  if (!v || typeof v !== "object") return {};
  return v as ParkHuntMap;
}

async function writeMap(map: ParkHuntMap): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { ...user.privateMetadata, parkHunt: map },
  });
}

/**
 * READ-ONLY. Return today's stored eagle word for the active child, or null.
 *
 * Does NOT assign or write — the eagle word is assigned only by Feather
 * Match's assignEagleWordAction. A second writer here would race that write
 * and clobber the word the child just earned.
 */
export async function getCurrentTargetAction(): Promise<
  | {
      childId: string;
      date: string;
      word: string;
      stationId: number;
      foundToday: number;
    }
  | null
> {
  const childId = await getActiveChildId();
  if (!childId) return null;
  const user = await currentUser();
  if (!user) return null;

  const date = todayKey();
  const map = readMap(user.privateMetadata);
  const existing = map[childId];

  if (existing && existing.date === date) {
    return {
      childId,
      date: existing.date,
      word: existing.word,
      stationId: existing.stationId,
      foundToday: existing.foundToday ?? 0,
    };
  }
  return null;
}

/** Rotate to a fresh target (called after a correct find / "another round"). */
export async function rotateTargetAction(): Promise<
  | { childId: string; date: string; word: string; stationId: number; foundToday: number }
  | null
> {
  const childId = await getActiveChildId();
  if (!childId) return null;
  const user = await currentUser();
  if (!user) return null;

  const date = todayKey();
  const map = readMap(user.privateMetadata);
  const prev = map[childId]?.word;
  const bank = await getGlobalWordBank();
  const next = nextTargetForChild(childId, date, prev, bank);
  const foundToday = map[childId]?.date === date ? map[childId].foundToday ?? 0 : 0;
  const stored: StoredTarget = { date, word: next.word, stationId: next.stationId, foundToday };
  await writeMap({ ...map, [childId]: stored });
  revalidatePath("/park-hunt", "page");
  return {
    childId,
    date: stored.date,
    word: stored.word,
    stationId: stored.stationId,
    foundToday,
  };
}

/**
 * The child found the target word at the right station. Award 1 feather +
 * 1 word-count + egg progress, then rotate to a fresh target.
 *
 * Returns the new target (so the UI can move straight into "Find the next
 * word") plus any egg-hatch payload from recordWordsFound.
 */
export async function submitFoundWordAction(args: {
  word: string;
  stationId: number;
}): Promise<
  | {
      ok: true;
      next: { word: string; stationId: number };
      foundToday: number;
      hatched?: import("@/lib/child-profile").HatchedEntry | null;
      crackJustCrossed?: {
        level: number;
        label: string;
        message: string;
        color: import("@/lib/child-profile").EggColor;
        wordsInEgg: number;
        wordsToHatch: number;
      } | null;
    }
  | { ok: false; reason: string }
> {
  const childId = await getActiveChildId();
  if (!childId) return { ok: false, reason: "No active child." };
  const user = await currentUser();
  if (!user) return { ok: false, reason: "Not signed in." };

  const date = todayKey();
  const map = readMap(user.privateMetadata);
  const target = map[childId];
  if (!target || target.date !== date) {
    return { ok: false, reason: "No active target — start a new round." };
  }

  // Validate against the LIVE station list (not a possibly-stale stored
  // stationId): the submitted word must be the child's target AND actually
  // live at the scanned station this week.
  const submittedWord = args.word.toUpperCase();
  if (submittedWord !== target.word) {
    return { ok: false, reason: "Wrong word." };
  }
  const bankForCheck = await getGlobalWordBank();
  const stationWords =
    dailyStations(weekKey(), bankForCheck).stations[args.stationId] ?? [];
  if (!stationWords.includes(target.word)) {
    return { ok: false, reason: "Wrong station — try another one." };
  }

  // Reward via the existing recordWordsFoundAction (handles +1 feather
  // base + word count + egg progress + level-up notifications). Any
  // hatched egg is returned so the UI can show the reveal.
  // Pass through the full HatchedEntry so the client can render the
  // shared EggHatchReveal overlay (character + color + wordsRead all
  // come from the recordWordsFound result).
  let hatched: import("@/lib/child-profile").HatchedEntry | null = null;
  let crackJustCrossed:
    | {
        level: number;
        label: string;
        message: string;
        color: import("@/lib/child-profile").EggColor;
        wordsInEgg: number;
        wordsToHatch: number;
      }
    | null = null;
  try {
    const result = await recordWordsFoundAction(1);
    if (result?.hatched) hatched = result.hatched;
    if (result?.crackJustCrossed) crackJustCrossed = result.crackJustCrossed;
  } catch (err) {
    console.warn("[park-hunt] recordWordsFound failed", err);
  }

  // Rotate target for the next round.
  const bank = await getGlobalWordBank();
  const next = nextTargetForChild(childId, date, target.word, bank);
  const foundToday = (target.foundToday ?? 0) + 1;
  const stored: StoredTarget = {
    date,
    word: next.word,
    stationId: next.stationId,
    foundToday,
  };
  await writeMap({ ...map, [childId]: stored });
  revalidatePath("/park-hunt", "page");
  return {
    ok: true,
    next: { word: next.word, stationId: next.stationId },
    foundToday,
    hatched,
    crackJustCrossed,
  };
}

/**
 * Set the Park Hunt target word from an external source (currently the
 * Feather Sort eagle reveal). Resolves the station from this week's
 * library and stores it for the active child so /park-hunt picks it up.
 *
 * Per the client spec: "If the eagle brings star, I will find that
 * 'star' word among the 6 QR stations." This is the wire that links
 * the two games.
 *
 * Returns ok:false (silently) if the word isn't in the bank. Sort
 * already filters its picks against the bank so this should never
 * happen in practice, but we don't want a typo to crash the flow.
 */
export async function setParkHuntTargetWordAction(
  rawWord: string,
): Promise<{ ok: true; word: string; stationId: number } | { ok: false; reason: string }> {
  const childId = await getActiveChildId();
  if (!childId) return { ok: false, reason: "No active child." };
  const user = await currentUser();
  if (!user) return { ok: false, reason: "Not signed in." };

  const word = rawWord.toUpperCase().trim();
  const week = weekKey();
  const bank = await getGlobalWordBank();
  const stationId = stationOfWord(word, week, bank);
  if (stationId < 0) {
    return { ok: false, reason: "Word isn't in this week's stations." };
  }

  const date = todayKey();
  const map = readMap(user.privateMetadata);
  const prev = map[childId];
  const foundToday = prev?.date === date ? prev.foundToday ?? 0 : 0;
  const stored: StoredTarget = {
    date,
    word,
    stationId,
    foundToday,
    wrongScans: 0,
  };
  await writeMap({ ...map, [childId]: stored });
  revalidatePath("/park-hunt", "page");
  return { ok: true, word, stationId };
}

/**
 * Pick the eagle's word for the child from THIS WEEK'S actual station words
 * (server-side, using the live global bank) and store it as their target.
 *
 * This is the authoritative source for the Feather Sort "magic word": the
 * sort game displays whatever this returns, so the word the child sees is
 * GUARANTEED to be huntable at a station. (The old flow picked the word on
 * the client from a static list, which could land on a word that wasn't in
 * this week's stations — `setParkHuntTargetWordAction` then silently failed
 * and the child kept a stale target, e.g. saw "star" but the park had
 * "chair".)
 */
export async function assignEagleWordAction(
  preferLength?: number,
): Promise<{ word: string; stationId: number } | null> {
  const childId = await getActiveChildId();
  if (!childId) return null;
  const user = await currentUser();
  if (!user) return null;

  const date = todayKey();
  const week = weekKey();
  const bank = await getGlobalWordBank();
  const { allWords } = dailyStations(week, bank);
  if (allWords.length === 0) return null;

  let pool = allWords;
  if (preferLength && preferLength > 0) {
    const exact = allWords.filter((w) => w.length === preferLength);
    const near = allWords.filter((w) => Math.abs(w.length - preferLength) <= 1);
    pool = exact.length ? exact : near.length ? near : allWords;
  }
  const word = pool[Math.floor(Math.random() * pool.length)];
  const stationId = stationOfWord(word, week, bank);

  const map = readMap(user.privateMetadata);
  const prev = map[childId];
  const foundToday = prev?.date === date ? prev.foundToday ?? 0 : 0;
  const stored: StoredTarget = { date, word, stationId, foundToday };
  await writeMap({ ...map, [childId]: stored });
  revalidatePath("/park-hunt", "page");
  return { word, stationId };
}

/**
 * Pure pick of an eagle word from THIS WEEK'S station words. No storage,
 * no per-child state — the chosen word is carried through the URL
 * (Feather Match → Park Hunt → scan → station), so there is exactly one
 * source of truth and nothing can overwrite it. Guaranteed huntable.
 */
export async function pickEagleWordAction(
  preferLength?: number,
): Promise<{ word: string } | null> {
  const bank = await getGlobalWordBank();
  const { allWords } = dailyStations(weekKey(), bank);
  if (allWords.length === 0) return null;
  let pool = allWords;
  if (preferLength && preferLength > 0) {
    const exact = allWords.filter((w) => w.length === preferLength);
    const near = allWords.filter((w) => Math.abs(w.length - preferLength) <= 1);
    pool = exact.length ? exact : near.length ? near : allWords;
  }
  const word = pool[Math.floor(Math.random() * pool.length)];
  return { word };
}

/**
 * The child scanned a station carrying `word` in the URL. If that word is
 * genuinely in the scanned station's list this week, award 1 feather (+ egg
 * progress) and report it. Stateless w.r.t. the target — the word is the
 * URL's, validated live, so there's no stored target to drift or clobber.
 */
export async function findWordAtStationAction(args: {
  word: string;
  stationId: number;
}): Promise<
  | {
      ok: true;
      hatched?: import("@/lib/child-profile").HatchedEntry | null;
      crackJustCrossed?: {
        level: number;
        label: string;
        message: string;
        color: import("@/lib/child-profile").EggColor;
        wordsInEgg: number;
        wordsToHatch: number;
      } | null;
    }
  | { ok: false; reason: string; limit?: boolean }
> {
  const word = (args.word || "").toUpperCase().replace(/[^A-Z]/g, "");
  if (!word) return { ok: false, reason: "No word." };
  const bank = await getGlobalWordBank();
  const list = dailyStations(weekKey(), bank).stations[args.stationId] ?? [];
  if (!list.includes(word)) {
    return { ok: false, reason: "Not at this station." };
  }

  // Free tier: 3 Park Hunt finds/day. Members unlimited.
  const gate = await tryConsumePlay("parkhunt");
  if (!gate.allowed) {
    return { ok: false, reason: "Daily Park Hunt limit reached.", limit: true };
  }

  let hatched: import("@/lib/child-profile").HatchedEntry | null = null;
  let crackJustCrossed:
    | {
        level: number;
        label: string;
        message: string;
        color: import("@/lib/child-profile").EggColor;
        wordsInEgg: number;
        wordsToHatch: number;
      }
    | null = null;
  try {
    const result = await recordWordsFoundAction(1);
    if (result?.hatched) hatched = result.hatched;
    if (result?.crackJustCrossed) crackJustCrossed = result.crackJustCrossed;
  } catch (err) {
    console.warn("[park-hunt] recordWordsFound failed", err);
  }
  return { ok: true, hatched, crackJustCrossed };
}

/** Server-side helper for the station route: get the 20-word list for a station. */
export async function getStationWordsAction(stationId: number): Promise<string[]> {
  if (stationId < 0 || stationId >= STATION_COUNT) return [];
  const bank = await getGlobalWordBank();
  return dailyStations(weekKey(), bank).stations[stationId];
}

/**
 * Check whether the child's CURRENT eagle word lives at the scanned station.
 *
 * Read-only and side-effect free. The pass condition is exactly the spec:
 * "if the QR has your word listed there, you pass." We look up the scanned
 * station's word list LIVE (so it can't drift from a stale stored stationId)
 * and check membership. We NEVER invent or credit a random word — if the
 * child has no active eagle word, hasTarget is false and the UI tells them to
 * play Feather Match first.
 */
export async function isCorrectStationAction(stationId: number): Promise<{
  hasTarget: boolean;
  matches: boolean;
  targetWord: string | null;
}> {
  const childId = await getActiveChildId();
  if (!childId) return { hasTarget: false, matches: false, targetWord: null };
  const user = await currentUser();
  if (!user) return { hasTarget: false, matches: false, targetWord: null };

  const date = todayKey();
  const map = readMap(user.privateMetadata);
  const target = map[childId];

  // No word for today → the child hasn't been handed one by the eagle yet.
  if (!target || target.date !== date) {
    return { hasTarget: false, matches: false, targetWord: null };
  }

  const bank = await getGlobalWordBank();
  const stationWords =
    dailyStations(weekKey(), bank).stations[stationId] ?? [];
  const matches = stationWords.includes(target.word);
  return { hasTarget: true, matches, targetWord: target.word };
}

