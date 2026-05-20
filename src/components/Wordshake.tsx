"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Home, RefreshCw, Sparkles, Timer, Volume2, VolumeX } from "lucide-react";
import {
  buzz,
  childCheer,
  childOoh,
  ding,
  fanfare,
  isMusicEnabled,
  pop,
  setMusicEnabled,
  startMusic,
  stopMusic,
  tick,
  urgentTick,
} from "@/lib/audio";
import { isDictWord } from "@/lib/wordshake-dict";
import { readProgress, saveProgress } from "@/lib/player";

const GRID_SIZE = 4;
const ROUND_SECONDS = 120;

// Distribution biased toward common letters and vowels — kid-friendly.
const DICE = [
  "AAEEGN","ABBJOO","ACHOPS","AFFKPS","AOOTTW","CIMOTU","DEILRX","DELRVY",
  "DISTTY","EEGHNW","EEINSU","EHRTVW","EIOSST","ELRTTY","HIMNQU","HLNNRZ",
];

function rollGrid(): string[] {
  const out: string[] = [];
  const dice = [...DICE].sort(() => Math.random() - 0.5);
  for (const d of dice) {
    out.push(d[Math.floor(Math.random() * d.length)]);
  }
  return out;
}

function scoreFor(word: string) {
  const n = word.length;
  if (n <= 2) return 0;
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

export function Wordshake() {
  const [grid, setGrid] = useState<string[]>(() => rollGrid());
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<{ word: string; points: number }[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [running, setRunning] = useState(true);
  const [boardClass, setBoardClass] = useState("");
  const [musicOn, setMusicOn] = useState(true);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => setMusicOn(isMusicEnabled()), []);

  useEffect(() => {
    if (musicOn && running) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [musicOn, running]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        const next = Math.max(0, s - 1);
        if (next === 0) {
          stopMusic();
          fanfare();
          setRunning(false);
        } else if (next <= 10) urgentTick();
        else if (next % 10 === 0) tick();
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const builtWord = useMemo(() => path.map((i) => grid[i]).join(""), [path, grid]);
  const totalPoints = useMemo(
    () => found.reduce((s, w) => s + w.points, 0),
    [found],
  );

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
    if (path.length < 3) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      return;
    }
    const w = builtWord.toUpperCase();
    if (found.some((f) => f.word === w)) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      return;
    }
    if (!isDictWord(w)) {
      buzz();
      setBoardClass("is-wrong");
      window.setTimeout(() => setBoardClass(""), 380);
      return;
    }
    const pts = scoreFor(w);
    setFound((arr) => [{ word: w, points: pts }, ...arr]);
    setPath([]);
    setBoardClass("is-win");
    window.setTimeout(() => setBoardClass(""), 380);
    pop();
    if (pts >= 4) childCheer();
    else childOoh();

    // Award 1 FeatherPop per 4 points (rounded down, min 0).
    const award = Math.floor(pts / 4);
    if (award > 0) {
      const cur = readProgress();
      saveProgress({
        ...cur,
        totalFeatherPop: cur.totalFeatherPop + award,
      });
    }
  }

  function newGame() {
    setGrid(rollGrid());
    setPath([]);
    setFound([]);
    setSecondsLeft(ROUND_SECONDS);
    setRunning(true);
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const timeFlash = secondsLeft <= 10 && running;

  // Compute line points between selected cells
  const linePoints = useMemo(() => {
    return path.map((idx) => {
      const r = Math.floor(idx / GRID_SIZE);
      const c = idx % GRID_SIZE;
      return { r, c };
    });
  }, [path]);

  return (
    <div className="wordshake">
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
        </div>

        <div className={`shake-board ${boardClass}`}>
          {grid.map((letter, idx) => {
            const sel = path.indexOf(idx);
            const isSel = sel !== -1;
            const isLast = sel === path.length - 1 && isSel;
            return (
              <button
                key={idx}
                ref={(el) => {
                  cellRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => tap(idx)}
                disabled={!running}
                className={`shake-cell ${isSel ? "is-selected" : ""} ${
                  isLast ? "is-last" : ""
                }`}
                aria-label={`Letter ${letter}${isSel ? `, selected ${sel + 1}` : ""}`}
              >
                {letter}
              </button>
            );
          })}

          {/* connect-the-dots line overlay */}
          {linePoints.length > 1 ? (
            <svg
              className="shake-line"
              viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
              preserveAspectRatio="none"
              aria-hidden
            >
              {linePoints.slice(1).map((pt, i) => {
                const prev = linePoints[i];
                return (
                  <line
                    key={i}
                    x1={prev.c + 0.5}
                    y1={prev.r + 0.5}
                    x2={pt.c + 0.5}
                    y2={pt.r + 0.5}
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

      <aside className="shake-side">
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
            disabled={path.length < 3 || !running}
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
            Time! You scored <strong>{totalPoints}</strong> points and{" "}
            {Math.floor(totalPoints / 4) > 0
              ? `earned ${Math.floor(totalPoints / 4)} FeatherPop.`
              : "no FeatherPop this time."}
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
