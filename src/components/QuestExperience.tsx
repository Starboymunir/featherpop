"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gamepad2,
  Lightbulb,
  Music2,
  Play,
  RefreshCw,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react";
import { Challenge } from "@/lib/game-data";
import {
  PlayerProgress,
  completeChallenge,
  readProgress,
  saveProgress,
} from "@/lib/player";
import {
  buzz,
  childOoh,
  ding,
  fanfare,
  isMusicEnabled,
  kidCrowdCheer,
  pop,
  setMusicEnabled,
  speak,
  startMusic,
  stopMusic,
  stopSpeaking,
  tick,
  urgentTick,
} from "@/lib/audio";
import { Mascot, MascotMood } from "@/components/Mascot";
import { KidAvatar } from "@/components/KidAvatar";

type Phase = "video" | "reveal" | "build" | "result";

const ROUND_SECONDS = 120; // 2 minutes

export function QuestExperience({ challenge }: { challenge: Challenge }) {
  const hasIntro = !!challenge.introVideoUrl;
  const [videoOk, setVideoOk] = useState<boolean | null>(hasIntro ? null : false);
  const [phase, setPhase] = useState<Phase>(hasIntro ? "video" : "reveal");
  const [selection, setSelection] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [poppedWord, setPoppedWord] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [mood, setMood] = useState<MascotMood>("idle");
  const [mascotMessage, setMascotMessage] = useState<string | undefined>();
  const [mascotNudge, setMascotNudge] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress>(() => readProgress());
  const completed = progress.completedChallengeSlugs.includes(challenge.slug);

  // All puzzle words: target + bonus words (uppercase, deduped)
  const wordList = useMemo(() => {
    const set = new Set<string>([challenge.targetWord.toUpperCase()]);
    challenge.bonusWords.forEach((w) => set.add(w.toUpperCase()));
    return Array.from(set).sort((a, b) => a.length - b.length || a.localeCompare(b));
  }, [challenge]);

  const targetUpper = challenge.targetWord.toUpperCase();
  const wonTarget = foundWords.includes(targetUpper);

  /* -------- Video probe -------- */
  useEffect(() => {
    if (!hasIntro) return;
    let cancelled = false;
    fetch(challenge.introVideoUrl as string, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        const ok = r.ok;
        setVideoOk(ok);
        if (!ok) setPhase("reveal");
      })
      .catch(() => {
        if (cancelled) return;
        setVideoOk(false);
        setPhase("reveal");
      });
    return () => {
      cancelled = true;
    };
  }, [hasIntro, challenge.introVideoUrl]);

  /* -------- Reveal phase: speak letter, then auto-advance -------- */
  useEffect(() => {
    if (phase !== "reveal") return;
    speak(`The letter is ${challenge.mainLetter}.`);
    const timer = window.setTimeout(() => setPhase("build"), 1800);
    return () => window.clearTimeout(timer);
  }, [phase, challenge.mainLetter]);

  /* -------- Music + music preference -------- */
  useEffect(() => {
    setMusicOn(isMusicEnabled());
  }, []);
  useEffect(() => {
    if (phase === "build" && musicOn) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [phase, musicOn]);

  /* -------- Timer -------- */
  useEffect(() => {
    if (phase !== "build" || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          stopMusic();
          setRunning(false);
          setPhase("result");
          fanfare();
        } else if (next <= 10) urgentTick();
        else if (next % 10 === 0) tick();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, running]);

  // Auto-start timer on entering build
  useEffect(() => {
    if (phase === "build" && !running && secondsLeft === ROUND_SECONDS) {
      setRunning(true);
    }
  }, [phase, running, secondsLeft]);

  /* -------- Idle nudge -------- */
  useEffect(() => {
    if (phase !== "build") return;
    const t = window.setTimeout(() => {
      if (selection.length === 0 && mood === "idle") {
        setMood("think");
        setMascotNudge((n) => n + 1);
      }
    }, 12000);
    return () => window.clearTimeout(t);
  }, [selection, phase, mood, foundWords.length]);

  /* -------- Build word from selection -------- */
  const builtWord = useMemo(
    () => selection.map((i) => challenge.letters[i]).join(""),
    [selection, challenge.letters],
  );

  function toggleLetter(idx: number) {
    setSelection((prev) => {
      if (prev.includes(idx)) {
        // tapping again removes from end (or removes that index)
        return prev.filter((p) => p !== idx);
      }
      ding(660 + prev.length * 60, 90);
      return [...prev, idx];
    });
  }

  function clearSelection() {
    setSelection([]);
  }

  function shuffleSelection() {
    // animate-shake the bank; we keep the letters but cycle their on-screen order via key
    setShakeKey((k) => k + 1);
    setSelection([]);
    pop();
  }

  function submit() {
    const guess = builtWord.toUpperCase();
    if (guess.length < 2) return;

    if (foundWords.includes(guess)) {
      // already found
      buzz();
      setMood("oops");
      setMascotMessage(`You already found "${guess}".`);
      setMascotNudge((n) => n + 1);
      setSelection([]);
      return;
    }

    if (guess === targetUpper) {
      const next = completeChallenge(challenge.slug, challenge.featherpopValue);
      setProgress(next);
      setFoundWords((arr) => [...arr, guess]);
      setPoppedWord(guess);
      fanfare();
      kidCrowdCheer();
      setMood("cheer");
      setMascotMessage(`${challenge.targetWord}! +${challenge.featherpopValue} FeatherPop!`);
      setMascotNudge((n) => n + 1);
      speak(
        completed
          ? `${challenge.targetWord}! Great spelling!`
          : `${challenge.targetWord}! You earned ${challenge.featherpopValue} FeatherPop!`,
      );
      setShowReward(true);
      setRunning(false);
      setSelection([]);
      window.setTimeout(() => {
        setShowReward(false);
        setPhase("result");
      }, 2800);
      return;
    }

    if (wordList.includes(guess)) {
      // bonus word
      const cur = readProgress();
      const updated: PlayerProgress = {
        ...cur,
        totalFeatherPop: cur.totalFeatherPop + 1,
      };
      saveProgress(updated);
      setProgress(updated);
      setFoundWords((arr) => [...arr, guess]);
      setPoppedWord(guess);
      ding(1200, 120);
      window.setTimeout(() => ding(1500, 120), 130);
      childOoh();
      setMood("wow");
      setMascotMessage(`Bonus word "${guess}"! +1 FeatherPop!`);
      setMascotNudge((n) => n + 1);
      speak(`Bonus word ${guess}! Plus one FeatherPop!`);
      setSelection([]);
      window.setTimeout(() => setPoppedWord(null), 1100);
      return;
    }

    // Not a known word
    buzz();
    setMood("oops");
    setShakeKey((k) => k + 1);
    setMascotMessage(`"${guess}" isn't in the puzzle — try another!`);
    setMascotNudge((n) => n + 1);
    speak("Try a different word!");
    setSelection([]);
  }

  /* -------- VIDEO -------- */
  if (phase === "video") {
    return (
      <section className="card overflow-hidden p-0">
        <Header challenge={challenge} step="Step 2 · Quest intro" inset />
        <div className="relative aspect-video bg-black">
          {videoOk === null ? (
            <div className="absolute inset-0 grid place-items-center text-white/70">
              Loading video…
            </div>
          ) : videoOk ? (
            <video
              src={challenge.introVideoUrl}
              controls
              autoPlay
              playsInline
              poster="/media/poster.jpeg"
              onEnded={() => setPhase("reveal")}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <p className="text-sm font-semibold text-[var(--ink-soft)]">
            Watch a quick toon, then build the word.
          </p>
          <button
            type="button"
            onClick={() => setPhase("reveal")}
            className="btn btn-ghost btn-sm"
          >
            Skip
          </button>
        </div>
      </section>
    );
  }

  /* -------- REVEAL -------- */
  if (phase === "reveal") {
    return (
      <section className="card">
        <Header challenge={challenge} step="Step 3 · Reveal" />
        <div className="reveal-stage">
          <span className="kicker">Main letter</span>
          <div className="reveal-main letter-burst">{challenge.mainLetter}</div>
          <p className="text-lg font-bold text-[var(--ink-soft)]">
            Find <strong>{wordList.length}</strong> words hidden in{" "}
            <strong>{challenge.letters.length}</strong> letters.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              stopSpeaking();
              setPhase("build");
            }}
          >
            <Play aria-hidden className="h-5 w-5" />
            Start the 2-minute round
            <ArrowRight aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </section>
    );
  }

  /* -------- RESULT -------- */
  if (phase === "result") {
    const allFound = foundWords.length === wordList.length;
    return (
      <section className="card card-deep">
        <div className="confetti-host relative grid place-items-center py-2">
          <Confetti />
          <Trophy aria-hidden className="h-14 w-14 text-[var(--gold)]" />
          <h1 className="h-display mt-4 text-center text-4xl">
            {wonTarget ? `${challenge.targetWord}!` : "Time's up!"}
          </h1>
          <p className="mt-2 text-center text-white/85">
            You found{" "}
            <strong className="text-[var(--gold)]">{foundWords.length}</strong>{" "}
            of {wordList.length} words
            {allFound ? " — clean sweep!" : "."}
          </p>
          {foundWords.length > 0 ? (
            <p className="mt-1 text-sm text-white/75">
              Words: {foundWords.join(", ")}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-white/65">
            Wallet balance:{" "}
            <strong className="text-[var(--gold)]">
              {progress.totalFeatherPop}
            </strong>{" "}
            FeatherPop
          </p>

          <div className="mt-6 grid w-full max-w-sm gap-2">
            <Link href="/scan" className="btn btn-gold">
              Scan another QR
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
            <Link href="/play" className="btn btn-ghost">
              <Gamepad2 aria-hidden className="h-4 w-4" />
              Play a side game
            </Link>
            <button
              type="button"
              onClick={() => {
                setFoundWords([]);
                setSecondsLeft(ROUND_SECONDS);
                setRunning(false);
                setPhase("build");
              }}
              className="btn btn-ghost"
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              Replay the round
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* -------- BUILD (Wordscape-style) -------- */
  const timeFlash = secondsLeft <= 10;
  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="card relative overflow-hidden pb-40 md:pb-32">
        <Header challenge={challenge} step="Step 4 · Build" />

        <div className="quest-toolbar mt-3">
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
            <Music2 aria-hidden className="h-4 w-4" />
            {musicOn ? "Music on" : "Music off"}
          </button>
          <div className="found-pill">
            <Sparkles aria-hidden className="h-4 w-4" />
            {foundWords.length}/{wordList.length} words
          </div>
        </div>

        <div className="mt-4 grid gap-5">
          <WordGrid wordList={wordList} found={foundWords} popped={poppedWord} />

          <div className="built-preview" key={`built-${shakeKey}`}>
            <span className="built-label">Your guess</span>
            <div className="built-letters">
              {builtWord.length === 0 ? (
                <em className="text-[var(--ink-soft)]">Tap letters below…</em>
              ) : (
                builtWord.split("").map((ch, i) => (
                  <span key={`${ch}-${i}`} className="built-letter">
                    {ch}
                  </span>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-center text-sm font-bold text-[var(--ink-soft)]">
              Tap letters to build any word from the letters
            </p>
            <div
              className={`letter-ring ${shakeKey ? "letter-ring-pulse" : ""}`}
              role="list"
              aria-label="Letter bank"
              data-count={challenge.letters.length}
              key={`ring-${shakeKey}`}
            >
              {challenge.letters.map((letter, index) => {
                const used = selection.includes(index);
                const isMain =
                  letter === challenge.mainLetter &&
                  index === challenge.letters.indexOf(challenge.mainLetter);
                return (
                  <button
                    key={`${letter}-${index}`}
                    type="button"
                    onClick={() => toggleLetter(index)}
                    className={`letter-tile ${isMain ? "is-main" : ""} ${
                      used ? "is-used" : ""
                    }`}
                    aria-label={`Letter ${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          {showHint ? (
            <p className="hint-bubble">
              💡 {challenge.hint}{" "}
              <em className="text-[var(--ink-soft)]">
                The main word is {challenge.targetWord.length} letters long.
              </em>
            </p>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={submit}
              disabled={builtWord.length < 2}
              className="btn btn-primary sm:col-span-2"
            >
              Submit “{builtWord || "…"}”
              <ArrowRight aria-hidden className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={shuffleSelection}
              className="btn btn-ghost"
            >
              <RefreshCw aria-hidden className="h-4 w-4" />
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHint((v) => !v);
                setMood("hint");
                setMascotMessage(undefined);
                setMascotNudge((n) => n + 1);
              }}
              className="btn btn-gold"
            >
              <Lightbulb aria-hidden className="h-4 w-4" />
              {showHint ? "Hide hint" : "Hint"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <button
              type="button"
              onClick={clearSelection}
              className="font-bold text-[var(--purple)]"
            >
              Clear letters
            </button>
            <button
              type="button"
              onClick={() =>
                speak(`Spell the word ${challenge.targetWord.toLowerCase()}.`)
              }
              className="inline-flex items-center gap-2 font-bold text-[var(--purple)]"
            >
              <Volume2 aria-hidden className="h-4 w-4" />
              Hear the main word
            </button>
            <Link href="/play" className="inline-flex items-center gap-2 font-bold text-[var(--purple)]">
              <Gamepad2 aria-hidden className="h-4 w-4" />
              Side game
            </Link>
          </div>
        </div>

        <Mascot mood={mood} message={mascotMessage} nudge={mascotNudge} />
        {showReward ? <RewardBurst word={targetUpper} /> : null}
      </section>

      <aside className="card card-deep">
        <span
          className="kicker"
          style={{ background: "rgba(255,255,255,0.18)", color: "white" }}
        >
          Quest booth
        </span>

        <div className="mt-4 min-h-[8rem]">
          <Sparkles aria-hidden className="h-10 w-10 text-[var(--gold)]" />
          <h2 className="h-display mt-3 text-2xl">{challenge.zone}</h2>
          <p className="mt-2 text-white/75">
            Find the secret word and as many bonus words as you can before the
            timer runs out.
          </p>
          <p className="mt-2 text-sm text-white/60">
            Green = found · faded = still hidden.
          </p>
        </div>

        <div className="mt-5 border-t border-white/15 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-white/55">
            Wallet balance
          </p>
          <p className="font-display text-5xl font-extrabold leading-none text-[var(--gold)]">
            {progress.totalFeatherPop}
          </p>
          <div className="mt-4 grid gap-2">
            <Link href="/wallet" className="btn btn-gold btn-sm">
              View Wallet
            </Link>
            <Link href="/play" className="btn btn-ghost btn-sm">
              <Gamepad2 aria-hidden className="h-4 w-4" />
              Side Game
            </Link>
            <Link href="/scan" className="btn btn-ghost btn-sm">
              Scan Again
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* -------- WordGrid (Wordscape-style) -------- */
function WordGrid({
  wordList,
  found,
  popped,
}: {
  wordList: string[];
  found: string[];
  popped: string | null;
}) {
  // Group by length for cleaner columns
  const byLen = useMemo(() => {
    const groups: Record<number, string[]> = {};
    wordList.forEach((w) => {
      (groups[w.length] ||= []).push(w);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([len, words]) => ({ len: Number(len), words }));
  }, [wordList]);

  return (
    <div className="word-grid">
      {byLen.map(({ len, words }) => (
        <div key={len} className="word-grid-col">
          <span className="word-grid-len">{len}</span>
          <div className="word-grid-list">
            {words.map((w) => {
              const isFound = found.includes(w);
              const isPop = popped === w;
              return (
                <div
                  key={w}
                  className={`word-row ${isFound ? "is-found" : ""} ${
                    isPop ? "is-pop" : ""
                  }`}
                  aria-label={isFound ? `${w} found` : `${w.length} letter word`}
                >
                  {w.split("").map((ch, i) => (
                    <span key={`${ch}-${i}`} className="word-cell">
                      {isFound ? ch : ""}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------- Header -------- */
function Header({
  challenge,
  step,
  inset,
}: {
  challenge: Challenge;
  step: string;
  inset?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-3 ${
        inset ? "p-4 md:p-5" : ""
      }`}
    >
      <div>
        <span className="kicker">{step}</span>
        <h1 className="h-display mt-2 text-3xl md:text-4xl">
          <span className="h-gradient">{challenge.zone}</span>
        </h1>
        <p className="text-sm font-semibold text-[var(--ink-soft)]">
          {challenge.qrLabel}
        </p>
      </div>
      <div
        className="grid min-h-16 min-w-20 place-items-center rounded-2xl px-3 text-center"
        style={{
          background: "linear-gradient(135deg, #ffe27a, var(--gold))",
          color: "var(--ink)",
        }}
      >
        <span className="text-[0.65rem] font-bold uppercase tracking-wide">
          Reward
        </span>
        <strong className="font-display text-2xl leading-none">
          +{challenge.featherpopValue}
        </strong>
      </div>
    </div>
  );
}

/* -------- Reward burst overlay -------- */
function RewardBurst({ word }: { word: string }) {
  return (
    <div className="reward-burst" role="status" aria-live="polite">
      <div className="reward-ring" />
      <div className="reward-ring reward-ring-2" />
      <div className="reward-word">
        {word.split("").map((ch, i) => (
          <span
            key={i}
            className="reward-letter"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className="reward-kids">
        <KidAvatar kid="ari" pose="cheer" size={72} />
        <KidAvatar kid="bee" pose="jump" size={72} delay={120} />
        <KidAvatar kid="kai" pose="cheer" size={72} delay={240} />
        <KidAvatar kid="lila" pose="jump" size={72} delay={360} />
      </div>
      <Confetti />
    </div>
  );
}

const CONFETTI_COLORS = [
  "var(--pink)",
  "var(--magenta)",
  "var(--purple)",
  "var(--gold)",
  "var(--mint)",
  "var(--sky-4)",
];

function Confetti() {
  const piecesRef = useRef<number[]>(
    Array.from({ length: 36 }, () => Math.random()),
  );
  const pieces = piecesRef.current;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((seed, i) => {
        const left = (i / pieces.length) * 100 + seed * 4 - 2;
        const delay = seed * 0.6;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const rot = Math.floor(seed * 360);
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}s`,
              transform: `rotate(${rot}deg)`,
            }}
          />
        );
      })}
      <style>{`
        .confetti-piece {
          position: absolute;
          top: 0;
          width: 8px;
          height: 14px;
          border-radius: 2px;
          animation: confetti-fall 2s ease-in forwards;
        }
        @keyframes confetti-fall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(320px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
