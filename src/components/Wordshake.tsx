"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Feather, Home, RefreshCw, Sparkles, Timer, Volume2, VolumeX } from "lucide-react";
import {
  buzz,
  childCheer,
  childOoh,
  ding,
  fanfare,
  isMusicEnabled,
  jingle,
  pop,
  setMusicEnabled,
  startMusic,
  stopMusic,
  tick,
  unlockVoiceClips,
  urgentTick,
} from "@/lib/audio";
import { isDictWord } from "@/lib/wordshake-dict";
import {
  awardFeatherPopAction,
  recordLetterPopScoreAction,
  recordWordsFoundAction,
} from "@/lib/child-progress-actions";
import type { EggColor, HatchedEntry } from "@/lib/child-profile";
import { EggHatchReveal } from "@/components/eggs/EggHatchReveal";
import { EggCrackReveal } from "@/components/eggs/EggCrackReveal";
import { GoldenFeatherReveal } from "@/components/progress/GoldenFeatherReveal";
import { useNavGuard } from "@/lib/use-nav-guard";
import { Mascot, MascotMood } from "@/components/Mascot";

const GRID_SIZE = 4;
const ROUND_SECONDS = 120;

// Weighted letter bags (kid-friendly, biased toward word-forming letters).
const VOWELS = "AEIOU";
const isVowel = (ch: string) => VOWELS.includes(ch);
// Vowel frequency ~ English (E/A most common, U least).
const VOWEL_BAG = "EEEEEAAAAOOOIIIU";
// Common consonants weighted up; rare ones (J/X/Q/Z) appear rarely.
const CONSONANT_BAG =
  "RRRTTTNNNSSSLLLDDDGGBBCCMMPPHHFFWWYYKV" + "JXQZ";
const pickFrom = (bag: string) => bag[Math.floor(Math.random() * bag.length)];

// Target 5–7 vowels on a 16-cell board so words are always formable.
const MIN_VOWELS = 5;
const MAX_VOWELS = 7;
// 2×2 quadrant of a cell — used to spread vowels so they're never all boxed
// into one corner.
const quadrantOf = (idx: number) => {
  const r = Math.floor(idx / GRID_SIZE);
  const c = idx % GRID_SIZE;
  return (r < 2 ? 0 : 1) * 2 + (c < 2 ? 0 : 1);
};

function neighborsOf(idx: number): number[] {
  const r = Math.floor(idx / GRID_SIZE);
  const c = idx % GRID_SIZE;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr,
        nc = c + dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      out.push(nr * GRID_SIZE + nc);
    }
  }
  return out.sort(() => Math.random() - 0.5);
}

function rollGrid(seedWord?: string): {
  grid: string[];
  seededPath?: number[];
} {
  const cells = GRID_SIZE * GRID_SIZE;
  const grid: (string | null)[] = new Array(cells).fill(null);
  let seededPath: number[] | undefined;

  // 1) Place the seeded key word along an adjacent path (fixed cells).
  if (seedWord) {
    const word = seedWord.toUpperCase().replace(/[^A-Z]/g, "");
    if (word.length >= 1 && word.length <= cells) {
      for (let tries = 0; tries < 60; tries++) {
        const start = Math.floor(Math.random() * cells);
        const path: number[] = [start];
        let ok = true;
        for (let i = 1; i < word.length; i++) {
          const last = path[path.length - 1];
          const next = neighborsOf(last).find((n) => !path.includes(n));
          if (next === undefined) {
            ok = false;
            break;
          }
          path.push(next);
        }
        if (ok && path.length === word.length) {
          for (let i = 0; i < word.length; i++) grid[path[i]] = word[i];
          seededPath = path;
          break;
        }
      }
    }
  }

  // 2) Decide which empty cells become vowels: at least one per quadrant, and
  //    at least MIN_VOWELS total, spread out rather than clustered.
  const empties: number[] = [];
  for (let i = 0; i < cells; i++) if (grid[i] === null) empties.push(i);
  empties.sort(() => Math.random() - 0.5);

  let vowelCount = 0;
  const quadHasVowel = [false, false, false, false];
  for (let i = 0; i < cells; i++) {
    if (grid[i] !== null && isVowel(grid[i]!)) {
      vowelCount++;
      quadHasVowel[quadrantOf(i)] = true;
    }
  }

  const vowelCells = new Set<number>();
  const totalVowels = () => vowelCount + vowelCells.size;
  // Ensure each quadrant has a vowel.
  for (let q = 0; q < 4; q++) {
    if (quadHasVowel[q] || totalVowels() >= MAX_VOWELS) continue;
    const cell = empties.find(
      (e) => quadrantOf(e) === q && !vowelCells.has(e),
    );
    if (cell !== undefined) vowelCells.add(cell);
  }
  // Top up to a random target in [MIN, MAX] for some variety.
  const targetVowels =
    MIN_VOWELS + Math.floor(Math.random() * (MAX_VOWELS - MIN_VOWELS + 1));
  for (const e of empties) {
    if (totalVowels() >= targetVowels) break;
    if (!vowelCells.has(e)) vowelCells.add(e);
  }

  // 3) Fill the rest.
  for (const e of empties) {
    grid[e] = vowelCells.has(e) ? pickFrom(VOWEL_BAG) : pickFrom(CONSONANT_BAG);
  }

  return { grid: grid as string[], seededPath };
}

function scoreFor(word: string) {
  const n = word.length;
  if (n < 2) return 0;
  if (n === 2) return 1;
  if (n === 3) return 1;
  if (n === 4) return 2;
  if (n === 5) return 4;
  if (n === 6) return 6;
  if (n === 7) return 10;
  return 11 + (n - 7) * 2;
}

function areAdjacent(a: number, b: number) {
  const ra = Math.floor(a / GRID_SIZE);
  const ca = a % GRID_SIZE;
  const rb = Math.floor(b / GRID_SIZE);
  const cb = b % GRID_SIZE;
  return Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1 && a !== b;
}

export function Wordshake({
  keyWord,
  initialBest = 0,
}: { keyWord?: string; initialBest?: number } = {}) {
  const router = useRouter();
  const initial = useMemo(() => rollGrid(keyWord), [keyWord]);
  const [grid, setGrid] = useState<string[]>(initial.grid);
  const [keyWordPath, setKeyWordPath] = useState<number[] | undefined>(
    initial.seededPath,
  );
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<{ word: string; points: number }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  // Don't auto-start — show the PLAY entry screen first so the AudioContext
  // can unlock on the user's tap (browsers block auto-play music + ticks).
  const [running, setRunning] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [boardClass, setBoardClass] = useState("");
  const [musicOn, setMusicOn] = useState(true);
  const [gridSeed, setGridSeed] = useState(0);
  const [flyScore, setFlyScore] = useState<{ value: number; key: number } | null>(
    null,
  );
  const [mood, setMood] = useState<MascotMood>("idle");
  const [mascotMessage, setMascotMessage] = useState<string | undefined>();
  const [mascotNudge, setMascotNudge] = useState(0);
  // Visible counter of FeatherPop earned this session — so the kid actually
  // sees the reward land instead of having to navigate to /rewards to
  // confirm the server got it.
  const [sessionPop, setSessionPop] = useState(0);
  // Per-child high score (points). `best` starts from the server value and
  // bumps live when a round beats it. `isNewBest` drives the celebration.
  const [best, setBest] = useState(initialBest);
  const [isNewBest, setIsNewBest] = useState(false);
  const hasPlayedRef = useRef(false);
  const scoreHandledRef = useRef(false);
  const [hatched, setHatched] = useState<HatchedEntry | null>(null);
  // Crack milestone the kid just crossed (10/20/30/40 words). Surfaces
  // the EggCrackReveal celebration overlay. Cleared when the kid
  // dismisses it. Hatch (50) takes precedence and renders the
  // EggHatchReveal instead.
  const [crackMilestone, setCrackMilestone] = useState<{
    level: number;
    label: string;
    message: string;
    color: EggColor;
    wordsInEgg: number;
  } | null>(null);
  // 1,000 words this month → the Golden Feather celebration.
  const [goldenFeather, setGoldenFeather] = useState(false);
  const pendingAwardsRef = useRef(0);
  const refreshTimerRef = useRef<number | null>(null);
  // Batching state for the persist flow — see acceptWord() comment.
  const pendingWordsRef = useRef(0);
  const pendingBonusRef = useRef(0);
  const flushTimerRef = useRef<number | null>(null);
  const awardChainRef = useRef<Promise<void>>(Promise.resolve());
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState({ w: 0, h: 0 });
  const [linePx, setLinePx] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => setMusicOn(isMusicEnabled()), []);

  /**
   * Flush any pending word/bonus batch RIGHT NOW. Returns a promise so
   * callers can await the persist before navigating. Race-safe via
   * awardChainRef — the chain queues this flush after any prior one.
   */
  const flushAwards = useCallback(async (): Promise<void> => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const words = pendingWordsRef.current;
    const bonus = pendingBonusRef.current;
    pendingWordsRef.current = 0;
    pendingBonusRef.current = 0;
    if (words === 0 && bonus === 0) {
      // Still await the prior chain so callers know nothing's in flight.
      try {
        await awardChainRef.current;
      } catch {
        /* prior chain swallowed */
      }
      return;
    }
    awardChainRef.current = awardChainRef.current.then(async () => {
      try {
        if (words > 0) {
          const recRes = await recordWordsFoundAction(words);
          if (recRes?.hatched) setHatched(recRes.hatched);
          else if (recRes?.crackJustCrossed) setCrackMilestone(recRes.crackJustCrossed);
          if (recRes?.goldenFeatherJustEarned) {
            setGoldenFeather(true);
          }
        }
        if (bonus > 0) await awardFeatherPopAction(bonus);
      } catch (err) {
        console.warn("[wordshake] flush failed:", err);
      }
    });
    try {
      await awardChainRef.current;
    } catch {
      /* swallowed */
    }
  }, []);

  // Round end: when the timer hits 0 and `running` flips to false, flush
  // pending awards immediately (don't wait the 500ms debounce). The kid
  // sees their final FeatherPop pill match what's actually persisted.
  useEffect(() => {
    if (running) return;
    void (async () => {
      await flushAwards();
      router.refresh();
    })();
  }, [running, flushAwards, router]);

  // On unmount: flush any pending word/bonus batch BEFORE navigating
  // away. Fire-and-forget since we can't await in cleanup, but it
  // queues through the same chain so the persist is still atomic.
  useEffect(() => {
    return () => {
      void flushAwards();
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        router.refresh();
      }
    };
  }, [router, flushAwards]);

  useEffect(() => {
    if (musicOn && running) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [musicOn, running]);

  // True while a celebration overlay is up (hatch or crack). The timer
  // pauses for the duration so the kid isn't penalized for watching
  // their reward animation.
  const paused = !!hatched || !!crackMilestone || goldenFeather;

  // Guard browser back + every <Link> click while a round is in
  // progress. Pause-overlay state DOESN'T count as in-progress for
  // navigation — once they've hatched, they've earned their break.
  useNavGuard(running && !paused);

  useEffect(() => {
    if (!running) return;
    if (paused) return; // freeze the clock while the reveal modal is up
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          stopMusic();
          fanfare();
          setRunning(false);
          setMood("cheer");
          setMascotMessage("Time! Great spelling, Word Explorer!");
          setMascotNudge((n) => n + 1);
        } else if (next <= 10) urgentTick();
        else if (next % 10 === 0) tick();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);

  const builtWord = useMemo(() => path.map((i) => grid[i]).join(""), [path, grid]);
  const totalPoints = useMemo(
    () => found.reduce((s, w) => s + w.points, 0),
    [found],
  );

  // When a round ends (timer hit 0 → running flips false) AND the kid
  // actually played it, record the score and update the high score.
  useEffect(() => {
    if (running) {
      scoreHandledRef.current = false;
      return;
    }
    if (!hasPlayedRef.current || scoreHandledRef.current) return;
    scoreHandledRef.current = true;
    (async () => {
      const res = await recordLetterPopScoreAction(totalPoints).catch(
        () => null,
      );
      if (res) {
        setBest(res.best);
        setIsNewBest(res.isNewBest);
        if (res.isNewBest && totalPoints > 0) {
          childCheer();
        }
      }
    })();
  }, [running, totalPoints]);

  function tap(idx: number) {
    if (!running) return;
    if (path.length === 0) {
      setPath([idx]);
      ding(660, 80);
      return;
    }
    const last = path[path.length - 1];
    if (idx === last) {
      // toggle off last
      setPath(path.slice(0, -1));
      return;
    }
    if (path.includes(idx)) return; // can't reuse
    if (!areAdjacent(last, idx)) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      return;
    }
    setPath([...path, idx]);
    ding(660 + path.length * 50, 80);
  }

  function cancel() {
    setPath([]);
  }

  function enter() {
    if (path.length < 2) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      setMood("hint");
      setMascotMessage("Tap at least two connected letters!");
      setMascotNudge((n) => n + 1);
      return;
    }
    const w = builtWord.toUpperCase();
    if (found.some((f) => f.word === w)) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      setMood("oops");
      setMascotMessage(`You already found "${w}".`);
      setMascotNudge((n) => n + 1);
      return;
    }
    if (!isDictWord(w)) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      setMood("oops");
      setMascotMessage(`"${w}" isn't a word — try another!`);
      setMascotNudge((n) => n + 1);
      return;
    }
    const pts = scoreFor(w);
    setFound((arr) => [{ word: w, points: pts }, ...arr]);
    setPath([]);
    setBoardClass("is-win");
    window.setTimeout(() => setBoardClass(""), 380);
    setFlyScore({ value: pts, key: Date.now() });
    window.setTimeout(() => setFlyScore(null), 950);
    pop();
    // Sparkly jingle on every correct word — climbs a little for longer words.
    jingle(w.length - 3);

    // ONE cheer per word. Magic-word bonus replaces the points cheer
    // instead of firing on top of it — was playing childCheer twice
    // back-to-back which the client heard as 'same sound twice'.
    const isMagic = !!(keyWord && w === keyWord.toUpperCase());
    if (isMagic) {
      childCheer();
    } else if (pts >= 4) {
      childCheer();
    } else {
      childOoh();
    }

    if (isMagic) {
      setMood("wow");
      setMascotMessage(`MAGIC WORD! "${w}" — bonus FeatherPop!`);
    } else if (w.length >= 5 || pts >= 6) {
      setMood("wow");
      setMascotMessage(`Big word! "${w}" — +${pts} points!`);
    } else {
      setMood("cheer");
      setMascotMessage(`"${w}" — +${pts} points!`);
    }
    setMascotNudge((n) => n + 1);

    // Per the client spec: 1 word = 1 feather. Floor on top:
    // every accepted word ALWAYS earns at least 1 feather, plus 1 more
    // for every 4 points the word's worth (so longer words still feel
    // more rewarding). Magic word from the eagle = +5 bonus.
    //
    // Earlier this used floor(pts/4) which returned 0 for 3-4 letter
    // words — the kid found the word but nothing landed on the server,
    // and the egg-cracking counter never moved.
    let award = Math.max(1, Math.floor(pts / 4));
    if (isMagic) {
      award += 5;
    }
    if (award > 0) {
      // Show it RIGHT NOW so the kid sees the reward (optimistic).
      setSessionPop((n) => n + award);
      pendingAwardsRef.current += award;
      // Persist on the server. We BATCH per-word calls in a short
      // window because firing recordWordsFoundAction(1) once per word
      // causes lost-update races on Clerk metadata — read-modify-write
      // calls overlap and overwrite each other, so a kid who earns 7
      // feathers in a round might only see +1 on the server.
      //
      // pendingWordsRef / pendingBonusRef accumulate the count of
      // words + bonus feathers since the last flush. A 500ms debounce
      // collapses bursts of taps into one atomic call.
      const baseFeather = 1;
      const bonus = Math.max(0, award - baseFeather);
      pendingWordsRef.current += 1;
      pendingBonusRef.current += bonus;

      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(() => {
        const words = pendingWordsRef.current;
        const bonusTotal = pendingBonusRef.current;
        pendingWordsRef.current = 0;
        pendingBonusRef.current = 0;
        flushTimerRef.current = null;

        // Serialize via a single promise chain so this flush always
        // sees the result of the previous one — guarantees no overlap
        // between concurrent record/award calls.
        awardChainRef.current = awardChainRef.current.then(async () => {
          try {
            if (words > 0) {
              const recRes = await recordWordsFoundAction(words);
              if (recRes?.hatched) setHatched(recRes.hatched);
              else if (recRes?.crackJustCrossed) setCrackMilestone(recRes.crackJustCrossed);
              if (recRes?.goldenFeatherJustEarned) {
                setGoldenFeather(true);
              }
            }
            if (bonusTotal > 0) await awardFeatherPopAction(bonusTotal);
          } catch (err) {
            console.warn("[wordshake] award failed:", err);
          }
        });

        // Refresh the layout once after the chain settles so BrandBar /
        // /rewards / HomeStats pick up the new total.
        if (refreshTimerRef.current !== null) {
          window.clearTimeout(refreshTimerRef.current);
        }
        refreshTimerRef.current = window.setTimeout(() => {
          router.refresh();
          refreshTimerRef.current = null;
          pendingAwardsRef.current = 0;
        }, 1200);
      }, 500);
    }
  }

  function newGame() {
    const fresh = rollGrid(keyWord);
    setGrid(fresh.grid);
    setKeyWordPath(fresh.seededPath);
    setGridSeed((s) => s + 1);
    setPath([]);
    setFound([]);
    setSecondsLeft(ROUND_SECONDS);
    setRunning(true);
    hasPlayedRef.current = true;
    setIsNewBest(false);
    setMood("idle");
    setMascotMessage(undefined);
    setMascotNudge((n) => n + 1);
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const timeFlash = secondsLeft <= 10 && running;

  // Compute line points in pixels from actual cell positions so the
  // overlay aligns with cell centers regardless of padding/gap.
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || path.length < 2) {
      setLinePx([]);
      return;
    }
    const boardRect = board.getBoundingClientRect();
    setBoardSize({ w: boardRect.width, h: boardRect.height });
    setLinePx(
      path.map((idx) => {
        const cell = cellRefs.current[idx];
        if (!cell) return { x: 0, y: 0 };
        const r = cell.getBoundingClientRect();
        return {
          x: r.left - boardRect.left + r.width / 2,
          y: r.top - boardRect.top + r.height / 2,
        };
      }),
    );
  }, [path, grid]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const ro = new ResizeObserver(() => {
      const r = board.getBoundingClientRect();
      setBoardSize({ w: r.width, h: r.height });
      setLinePx((prev) =>
        prev.map((_, i) => {
          const cell = cellRefs.current[path[i]];
          if (!cell) return { x: 0, y: 0 };
          const cr = cell.getBoundingClientRect();
          return {
            x: cr.left - r.left + cr.width / 2,
            y: cr.top - r.top + cr.height / 2,
          };
        }),
      );
    });
    ro.observe(board);
    return () => ro.disconnect();
  }, [path]);

  function startGame() {
    setShowIntro(false);
    setRunning(true);
    hasPlayedRef.current = true;
    setIsNewBest(false);
    pop();
    // This tap is the user gesture — prime voice clips so eagle/spider
    // lines play later from non-gesture handlers (iOS Safari rule).
    unlockVoiceClips();
    // Music will start via the existing musicOn effect; the tap unlocks it.
  }

  if (showIntro) {
    return (
      <div className="wordshake-intro">
        <div className="wordshake-intro-card">
          <span className="kicker">
            <Sparkles aria-hidden className="h-4 w-4" />
            Letter Pop
          </span>
          <h2 className="h-display wordshake-intro-title">
            {keyWord ? (
              <>
                Spell <span className="h-gradient">{keyWord}</span>
              </>
            ) : (
              <span className="h-gradient">Build words to earn FeatherPop</span>
            )}
          </h2>
          <p className="wordshake-intro-sub">
            Tap connected letters to spell words. You have 2 minutes — every
            word scores points, and points become FeatherPop.
          </p>
          {best > 0 ? (
            <p className="wordshake-best-line">
              🏆 Best score: <strong>{best}</strong> — can you beat it?
            </p>
          ) : null}
          <button
            type="button"
            onClick={startGame}
            className="play-button wordshake-intro-play"
            aria-label="Play Letter Pop"
          >
            <span className="play-button-ring" aria-hidden />
            <span className="play-button-ring play-button-ring-2" aria-hidden />
            <span className="play-button-text">PLAY</span>
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            <Home aria-hidden className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wordshake">
      {goldenFeather ? (
        <GoldenFeatherReveal onClose={() => setGoldenFeather(false)} />
      ) : hatched ? (
        <EggHatchReveal hatched={hatched} onClose={() => setHatched(null)} />
      ) : crackMilestone ? (
        <EggCrackReveal
          {...crackMilestone}
          onClose={() => setCrackMilestone(null)}
        />
      ) : null}
      <section>
        <div className="quest-toolbar mb-3">
          <div className={`timer-pill ${timeFlash ? "is-flash" : ""}`}>
            <Timer aria-hidden className="h-4 w-4" />
            <span>
              {mm}:{ss}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !musicOn;
              setMusicOn(next);
              setMusicEnabled(next);
              if (next) startMusic();
              else stopMusic();
            }}
            className={`music-pill ${musicOn ? "is-on" : ""}`}
            aria-pressed={musicOn}
          >
            {musicOn ? (
              <Volume2 aria-hidden className="h-4 w-4" />
            ) : (
              <VolumeX aria-hidden className="h-4 w-4" />
            )}
            {musicOn ? "Music" : "Muted"}
          </button>
          <div className="found-pill">
            <Sparkles aria-hidden className="h-4 w-4" />
            {totalPoints} pts
          </div>
          {best > 0 ? (
            <div className="found-pill" title="Your best score">
              🏆 {best}
            </div>
          ) : null}
          {sessionPop > 0 ? (
            <div className="featherpop-pill" aria-live="polite">
              <Feather aria-hidden className="h-4 w-4" />
              +{sessionPop} FeatherPop
            </div>
          ) : null}
          {keyWord ? (
            <div
              className={`keyword-pill ${found.some((f) => f.word === keyWord.toUpperCase()) ? "is-found" : ""}`}
            >
              <Sparkles aria-hidden className="h-4 w-4" />
              Goal:&nbsp;<strong>{keyWord.toUpperCase()}</strong>
            </div>
          ) : null}
        </div>

        <div ref={boardRef} className={`shake-board ${boardClass}`}>
          {grid.map((letter, idx) => {
            const sel = path.indexOf(idx);
            const isSel = sel !== -1;
            const isLast = sel === path.length - 1 && isSel;
            const isKeyCell = keyWordPath?.includes(idx) ?? false;
            return (
              <button
                key={`${gridSeed}-${idx}`}
                ref={(el) => {
                  cellRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => tap(idx)}
                disabled={!running}
                className={`shake-cell ${isSel ? "is-selected" : ""} ${
                  isLast ? "is-last" : ""
                } ${isKeyCell ? "is-key" : ""}`}
                style={{ animationDelay: `${idx * 30}ms` }}
                aria-label={`Letter ${letter}${isSel ? `, selected ${sel + 1}` : ""}`}
              >
                {letter}
              </button>
            );
          })}

          {flyScore ? (
            <span key={flyScore.key} className="shake-flyscore">
              +{flyScore.value}
            </span>
          ) : null}

          {/* connect-the-dots line overlay */}
          {linePx.length > 1 && boardSize.w > 0 ? (
            <svg
              className="shake-line"
              width={boardSize.w}
              height={boardSize.h}
              viewBox={`0 0 ${boardSize.w} ${boardSize.h}`}
              aria-hidden
            >
              {linePx.slice(1).map((pt, i) => {
                const prev = linePx[i];
                return (
                  <line
                    key={i}
                    x1={prev.x}
                    y1={prev.y}
                    x2={pt.x}
                    y2={pt.y}
                  />
                );
              })}
            </svg>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={newGame} className="btn btn-ghost btn-sm">
            <RefreshCw aria-hidden className="h-4 w-4" />
            New game
          </button>
          <Link href="/" className="btn btn-ghost btn-sm">
            <Home aria-hidden className="h-4 w-4" />
            Home
          </Link>
        </div>
      </section>

      {/* Mobile-only floating action dock — keeps the current word + the
          Cancel/Enter buttons within thumb reach of the grid so the kid
          doesn't have to scroll past the mascot card to submit. */}
      <div
        className={`shake-dock ${path.length > 0 ? "is-active" : ""}`}
        aria-hidden={path.length === 0}
      >
        <div className="shake-dock-word">
          {builtWord.length === 0 ? (
            <em>Tap connected letters…</em>
          ) : (
            builtWord
          )}
        </div>
        <div className="shake-dock-actions">
          <button
            type="button"
            onClick={cancel}
            disabled={path.length === 0}
            className="shake-dock-btn shake-dock-btn-cancel"
            aria-label="Cancel word"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={enter}
            disabled={path.length < 2 || !running}
            className="shake-dock-btn shake-dock-btn-enter"
            aria-label="Enter word"
          >
            Enter
          </button>
        </div>
      </div>

      <aside className="shake-side">
        <Mascot mood={mood} message={mascotMessage} nudge={mascotNudge} />
        <div className="shake-builder">
          {builtWord.length === 0 ? (
            <em>Tap connected letters…</em>
          ) : (
            builtWord
          )}
        </div>

        <div className="shake-actions">
          <button
            type="button"
            onClick={cancel}
            disabled={path.length === 0}
            className="shake-btn shake-btn-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={enter}
            disabled={path.length < 2 || !running}
            className="shake-btn shake-btn-enter"
          >
            Enter
          </button>
        </div>

        <div className="shake-words" aria-live="polite">
          <div
            className="shake-words-row"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            <span>Word</span>
            <span>Points</span>
          </div>
          {found.length === 0 ? (
            <div className="shake-words-row">
              <span style={{ opacity: 0.55 }}>No words yet</span>
              <span style={{ opacity: 0.55 }}>0</span>
            </div>
          ) : (
            found.map((f) => (
              <div key={f.word} className="shake-words-row">
                <span>{f.word}</span>
                <span>{f.points}</span>
              </div>
            ))
          )}
        </div>

        {!running ? (
          <div
            className="rounded-2xl p-3 text-center"
            style={{
              background: "linear-gradient(135deg, var(--gold), #ff9f3a)",
              color: "var(--ink)",
              fontWeight: 800,
            }}
          >
            {isNewBest && totalPoints > 0 ? (
              <div className="wordshake-newbest">🏆 NEW HIGH SCORE!</div>
            ) : null}
            Time! You scored <strong>{totalPoints}</strong> points and{" "}
            {Math.floor(totalPoints / 4) > 0
              ? `earned ${Math.floor(totalPoints / 4)} FeatherPop.`
              : "no FeatherPop this time."}
            {best > 0 ? (
              <div className="mt-1 text-sm font-bold">
                Best score: {best}
              </div>
            ) : null}
            <div className="mt-2">
              <button
                type="button"
                onClick={newGame}
                className="shake-btn shake-btn-enter w-full"
              >
                Play again
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
