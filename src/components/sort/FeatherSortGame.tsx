"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Heart, RefreshCw, Sparkles, Timer } from "lucide-react";
import { FEATHER_META, FEATHER_ORDER } from "@/lib/levels";
import type { FeatherType } from "@/lib/missions";
import { pickKeyWord } from "@/lib/sort-words";
import { useActiveChild } from "@/lib/use-active-child";
import { awardFeatherPopAction } from "@/lib/child-progress-actions";
import { pickEagleWordAction } from "@/lib/park-hunt-actions";
import { useNavGuard } from "@/lib/use-nav-guard";
import { FeatherSvg, NestSvg } from "./FeatherSvg";
import { BirdFlight } from "./BirdFlight";
import { Spider } from "./Spider";
import { Mascot, MascotMood } from "@/components/Mascot";
import { Confetti } from "@/components/Confetti";
import {
  birdWhoosh,
  childCheer,
  eagleCheers,
  eagleVoice,
  fanfare,
  featherDrop,
  featherPickup,
  jingle,
  pop,
  spiderApproach,
  spiderVoice,
  startMusic,
  stopMusic,
  unlockVoiceClips,
  urgentTick,
  wordReveal,
  wrongDrop,
} from "@/lib/audio";

type Phase = "levelselect" | "playing" | "bird" | "reveal" | "spider" | "won" | "lost";

interface FeatherInstance {
  id: string;
  type: FeatherType;
  x: number; // % across the play area
  y: number; // % down the play area
  rot: number;
  placed: FeatherType | null;
}

const LIVES = 5;

// Timer comes from the chosen level (tighter at higher levels).
function timerForRound(level: number): number {
  return levelConfig(level).seconds;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Player-chosen difficulty levels. Nest count is CAPPED at 4 so all nests
// always fit on a phone without scrolling — higher levels get harder through
// denser scatter + a tighter timer, not more nests.
interface SortLevel {
  id: number;
  label: string;
  emoji: string;
  nests: number; // 2..4
  perColor: number; // feathers of each color
  seconds: number;
}
// Nests are fixed at 3 so the whole board always fits a phone screen with no
// scrolling — difficulty comes purely from denser feathers + less time.
const SORT_LEVELS: SortLevel[] = [
  { id: 1, label: "Easy",   emoji: "🌱", nests: 3, perColor: 2, seconds: 30 },
  { id: 2, label: "Medium", emoji: "⭐", nests: 3, perColor: 3, seconds: 26 },
  { id: 3, label: "Hard",   emoji: "🔥", nests: 3, perColor: 4, seconds: 22 },
  { id: 4, label: "Expert", emoji: "👑", nests: 3, perColor: 6, seconds: 18 },
];
function levelConfig(level: number): SortLevel {
  return SORT_LEVELS[Math.max(0, Math.min(SORT_LEVELS.length - 1, level - 1))];
}

// How many feather TYPES to use this round (= nest count, capped at 4).
function pickColorsForRound(level: number): FeatherType[] {
  return shuffle(FEATHER_ORDER).slice(0, levelConfig(level).nests);
}

// How many feathers of EACH color to scatter (denser at higher levels).
function feathersPerColor(level: number): number {
  return levelConfig(level).perColor;
}

// The mascot lives in the bottom-LEFT corner with a speech bubble that
// extends ~30% across the scatter area. Feathers placed in there get hidden
// behind it, frustrating kids who can't see what they need to drag. Keep
// the scatter out of that wedge.
function inMascotZone(x: number, y: number): boolean {
  // The mascot bubble + figure occupy roughly the bottom-left 38% × 28%
  // of the play area. Reject any scatter point that lands in there.
  return x < 38 && y > 72;
}

function makeRound(types: FeatherType[], perColor: number): FeatherInstance[] {
  // `perColor` of each → density grows with the round. Scattered on the LEFT
  // portion of the play area so child drags rightward to the nest column,
  // with the mascot's bottom-left zone excluded.
  const all: FeatherInstance[] = [];
  let i = 0;
  for (const t of types) {
    for (let k = 0; k < perColor; k++) {
      // Reject-and-resample until the point isn't behind the mascot.
      let x = 0;
      let y = 0;
      for (let attempt = 0; attempt < 12; attempt++) {
        x = 4 + Math.random() * 64;
        y = 4 + Math.random() * 70;
        if (!inMascotZone(x, y)) break;
      }
      // If 12 attempts all landed in the mascot zone (unlucky), force above it.
      if (inMascotZone(x, y)) y = 4 + Math.random() * 55;
      all.push({
        id: `${t}-${k}-${i++}`,
        type: t,
        x,
        y,
        rot: -28 + Math.random() * 56,
        placed: null,
      });
    }
  }
  return shuffle(all);
}

export function FeatherSortGame() {
  const router = useRouter();
  const { activeChildId } = useActiveChild();

  // `round` now means the CHOSEN difficulty level (1..4). Set by the player
  // via the level picker, not auto-incremented.
  const [round, setRound] = useState(1);
  const [roundTypes, setRoundTypes] = useState<FeatherType[]>(() =>
    pickColorsForRound(1),
  );

  const [feathers, setFeathers] = useState<FeatherInstance[]>(() =>
    makeRound(roundTypes, feathersPerColor(1)),
  );
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(() => timerForRound(1));
  // Start by asking the child to pick a difficulty.
  const [phase, setPhase] = useState<Phase>("levelselect");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [wrongPulse, setWrongPulse] = useState<FeatherType | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  // Consecutive correct placements → the placement jingle climbs, so a tidy
  // sorter sounds like they're on a roll. Resets on a wrong nest / new round.
  const placeComboRef = useRef(0);
  const [mood, setMood] = useState<MascotMood>("idle");
  const [mascotMsg, setMascotMsg] = useState<string | undefined>();
  const [mascotNudge, setMascotNudge] = useState(0);

  // Local key word — only used to size the round / drive the bird animation
  // timing. The AUTHORITATIVE eagle word (what's shown + what Park Hunt
  // stores) comes from the server (see eagleWord below), so it's guaranteed
  // to be huntable at a real station this week.
  const keyWord = useMemo(
    () => pickKeyWord(Math.min(7, 3 + round)),
    [round],
  );

  // The server-assigned eagle word for THIS round. Null until the assign
  // resolves; we fall back to keyWord.word for display until then.
  const [eagleWord, setEagleWord] = useState<string | null>(null);
  // Guards the once-per-round "win → fetch word → launch bird" sequence.
  const summoningRef = useRef(false);

  // What the kid sees / hunts. Set before the bird launches (see the win
  // handler), so the parchment never shows a placeholder.
  const displayWord = eagleWord ?? keyWord.word;

  // Fresh round → forget the previous round's word and re-arm the summon.
  useEffect(() => {
    setEagleWord(null);
    summoningRef.current = false;
  }, [round]);

  // Announce the word once the eagle (server) has chosen it, during reveal.
  useEffect(() => {
    if (phase !== "reveal" || !eagleWord) return;
    setMascotMsg(`Magic word: ${eagleWord}! Find it at the park!`);
    setMascotNudge((n) => n + 1);
  }, [phase, eagleWord]);

  // Boot music when the game mounts (the PLAY-button tap on home already
  // unlocked the AudioContext, so this just keeps the music going).
  // Cleanup on unmount — without it, the loop persisted into the next
  // page if the kid navigated mid-game.
  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, []);

  // Confirm before any navigation interrupts an active sort round.
  useNavGuard(phase === "playing");

  // Re-scatter and reset timer on every round change.
  useEffect(() => {
    setFeathers(makeRound(roundTypes, feathersPerColor(round)));
    setTimeLeft(timerForRound(round));
  }, [roundTypes, round]);

  // Spider-warning ref — guarantees the "Oh no, let's hurry up before
  // the spider comes!" voice line plays AT MOST ONCE per round at the
  // urgency threshold. The client explicitly asked that this line
  // play EARLY (as a warning) rather than after the timer expires.
  const spiderWarnedRef = useRef(false);

  // Reset the warning flag whenever a new round / fresh playing phase
  // starts, so the next round gets its own warning.
  useEffect(() => {
    if (phase === "playing") spiderWarnedRef.current = false;
  }, [phase, round]);

  // Countdown timer.
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      // Time up → spider arrives. No voice clip here — the warning
      // ("Oh no, let's hurry up before the spider comes!") already
      // played at the urgency threshold below.
      window.setTimeout(() => {
        setPhase("spider");
        setMood("oops");
        setMascotMsg("Out of time! The spider snuck in…");
        setMascotNudge((n) => n + 1);
        spiderApproach();
      }, 200);
      return;
    }
    // Urgency warning — at 10s remaining play the spider voice line
    // as a "hurry!" warning (once per round).
    if (timeLeft <= 10 && !spiderWarnedRef.current) {
      spiderWarnedRef.current = true;
      spiderVoice();
    }
    const t = window.setTimeout(() => {
      setTimeLeft((s) => s - 1);
      if (timeLeft <= 11) urgentTick();
    }, 1000);
    return () => window.clearTimeout(t);
  }, [phase, timeLeft, round]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 6 } }),
  );

  const allPlaced = feathers.every((f) => f.placed !== null);
  useEffect(() => {
    if (
      phase !== "playing" ||
      !allPlaced ||
      feathers.length === 0 ||
      summoningRef.current
    ) {
      return;
    }
    summoningRef.current = true;
    setMood("wow");
    setMascotMsg("Wonderful! The eagle is coming with a magic word!");
    setMascotNudge((n) => n + 1);
    setConfettiKey((k) => k + 1);
    pop();
    window.setTimeout(() => childCheer(), 200);
    // Fetch the eagle's word FIRST, then launch the bird — so the parchment
    // banner shows the real word from the very first frame (no placeholder
    // flicker). The word stays in component state and rides the URL onward.
    (async () => {
      const res = await pickEagleWordAction(keyWord.length).catch(() => null);
      setEagleWord(res?.word ?? keyWord.word);
      setPhase("bird");
      window.setTimeout(() => birdWhoosh(), 300);
      window.setTimeout(() => eagleVoice(), 700); // Strudelay! Strudelay!
      window.setTimeout(() => fanfare(), 1800);
      window.setTimeout(() => wordReveal(), 2800);
      window.setTimeout(() => eagleCheers(), 4000);
    })();
  }, [allPlaced, phase, feathers.length, keyWord.length, keyWord.word]);

  const onDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    featherPickup();
    // First drag is a user gesture — use it to unlock the voice clips so
    // the eagle/spider lines play later. unlockVoiceClips is idempotent.
    unlockVoiceClips();
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = e;
      const featherId = String(active.id);
      if (!over) return;
      const targetType = String(over.id).replace(/^nest-/, "") as FeatherType;
      const feather = feathers.find((f) => f.id === featherId);
      if (!feather) return;

      if (feather.type === targetType) {
        featherDrop();
        placeComboRef.current += 1;
        // A short sparkle that climbs with the placement streak.
        jingle(Math.min(6, placeComboRef.current - 1));
        setFeathers((list) =>
          list.map((f) => (f.id === featherId ? { ...f, placed: targetType } : f)),
        );
      } else {
        wrongDrop();
        placeComboRef.current = 0;
        setWrongPulse(targetType);
        window.setTimeout(() => setWrongPulse(null), 600);
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) {
            window.setTimeout(() => {
              setPhase("spider");
              setMood("oops");
              setMascotMsg("Oh no — try again, you can do it!");
              setMascotNudge((n) => n + 1);
              spiderApproach();
              window.setTimeout(() => spiderVoice(), 700);
            }, 350);
          } else {
            setMood("oops");
            setMascotMsg("Not that nest — match the colors!");
            setMascotNudge((n) => n + 1);
          }
          return Math.max(0, next);
        });
      }
    },
    [feathers],
  );

  function resetRound() {
    placeComboRef.current = 0;
    const types = pickColorsForRound(round);
    setRoundTypes(types);
    setFeathers(makeRound(types, feathersPerColor(round)));
    setLives(LIVES);
    setTimeLeft(timerForRound(round));
    setPhase("playing");
    setMood("idle");
    setMascotMsg(undefined);
    setMascotNudge((n) => n + 1);
  }

  // "New round" no longer auto-escalates — it lets the child pick a level.
  function nextRound() {
    setPhase("levelselect");
  }

  // Start a fresh round at the chosen difficulty level.
  function startLevel(level: number) {
    placeComboRef.current = 0;
    summoningRef.current = false;
    setEagleWord(null);
    setRound(level);
    const types = pickColorsForRound(level);
    setRoundTypes(types);
    setFeathers(makeRound(types, feathersPerColor(level)));
    setLives(LIVES);
    setTimeLeft(timerForRound(level));
    setPhase("playing");
    setMood("idle");
    setMascotMsg(undefined);
    setMascotNudge((n) => n + 1);
  }

  async function goParkHunt() {
    if (!eagleWord) return;
    try {
      if (activeChildId)
        await awardFeatherPopAction(Math.max(1, Math.floor(roundTypes.length / 2)));
    } catch {}
    // Carry the eagle's word through the URL — it's the single source of
    // truth the whole way: /park-hunt → /scan → /park-hunt/station/N.
    router.push(`/park-hunt?word=${encodeURIComponent(eagleWord)}`);
  }

  const timeUrgent = phase === "playing" && timeLeft <= 10;

  return (
    <div className="sort-stage sort-stage-forest">
      <Confetti trigger={confettiKey} pieces={70} />

      {/* Forest silhouette overlay — pure CSS trees flanking the play area */}
      <div className="forest-overlay" aria-hidden>
        <div className="forest-trees forest-trees-left">
          <span /><span /><span />
        </div>
        <div className="forest-trees forest-trees-right">
          <span /><span /><span />
        </div>
        <div className="forest-ground" />
      </div>

      {phase === "levelselect" ? (
        <div className="sort-levelselect">
          <span className="kicker">
            <Sparkles aria-hidden className="h-4 w-4" />
            Feather Match
          </span>
          <h1 className="h-display text-3xl">
            <span className="h-gradient">Choose your challenge!</span>
          </h1>
          <p className="sort-levelselect-sub">
            Harder levels have more feathers to sort and less time.
          </p>
          <div className="sort-levelselect-grid">
            {SORT_LEVELS.map((lv) => (
              <button
                key={lv.id}
                type="button"
                onClick={() => startLevel(lv.id)}
                className={`sort-level-card ${round === lv.id ? "is-current" : ""}`}
              >
                <span className="sort-level-emoji" aria-hidden>{lv.emoji}</span>
                <span className="sort-level-label">{lv.label}</span>
                <span className="sort-level-meta">
                  {lv.nests} nests · {lv.nests * lv.perColor} feathers · {lv.seconds}s
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {phase !== "levelselect" ? (
      <header className="sort-hud">
        <span className="kicker">
          <Sparkles aria-hidden className="h-4 w-4" />
          {levelConfig(round).emoji} {levelConfig(round).label}
        </span>
        <h1 className="h-display text-2xl">
          <span className="h-gradient">Match the feathers</span>
        </h1>
        <div className="sort-hud-right">
          <span className={`sort-timer ${timeUrgent ? "is-urgent" : ""}`}>
            <Timer aria-hidden className="h-4 w-4" />
            {timeLeft}s
          </span>
          <div className="sort-lives">
            {Array.from({ length: LIVES }).map((_, i) => (
              <Heart
                key={i}
                aria-hidden
                className={`sort-life ${i < lives ? "is-on" : "is-off"}`}
              />
            ))}
          </div>
        </div>
      </header>
      ) : null}

      {phase === "playing" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="sort-board sort-board-horizontal">
            <div className="sort-board-scatter">
              {feathers
                .filter((f) => f.placed === null)
                .map((f) => (
                  <DraggableFeather
                    key={f.id}
                    feather={f}
                    isActive={activeId === f.id}
                  />
                ))}
            </div>

            <div className="sort-board-nests sort-board-nests-vertical">
              {roundTypes.map((t) => {
                const placed = feathers.filter((f) => f.placed === t);
                return (
                  <NestDrop
                    key={t}
                    type={t}
                    placedCount={placed.length}
                    wrong={wrongPulse === t}
                  />
                );
              })}
            </div>
          </div>
        </DndContext>
      ) : null}

      {phase === "bird" ? (
        <BirdFlight
          word={displayWord}
          onReveal={() => {
            setPhase("reveal");
            setMood("cheer");
            setMascotMsg("The eagle has a magic word for you!");
            setMascotNudge((n) => n + 1);
          }}
        />
      ) : null}

      {phase === "reveal" ? (
        <div className="sort-reveal">
          {/* Eagle perched on top of a big center-stage parchment */}
          <div className="sort-reveal-stage">
            <div className="sort-reveal-eagle" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/sort/bird-fly.png" alt="" />
            </div>
            <div
              className="sort-reveal-scroll"
              role="img"
              aria-label={`Eagle's magic word: ${displayWord}`}
            >
              <div className="sort-reveal-scroll-text">
                <p className="kicker">
                  <Sparkles aria-hidden className="h-4 w-4" />
                  Eagle&apos;s magic word
                </p>
                <h2 className="sort-reveal-word">{eagleWord ?? "…"}</h2>
                {!eagleWord ? (
                  <p className="sort-reveal-hint">The eagle is choosing…</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="sort-reveal-actions">
            {/* Per the partner spec (Adefila): the eagle's word ALWAYS
                routes through Park Hunt. The kid finds it at the right
                station first, then lands in Letter Pop after the scan.
                No Letter Pop bypass here. */}
            <button
              type="button"
              onClick={goParkHunt}
              disabled={!eagleWord}
              className="btn btn-gold btn-lg btn-pulse"
            >
              {eagleWord ? "Find it at the park (Scan)" : "Calling the eagle…"}
            </button>
            <button type="button" onClick={nextRound} className="btn btn-ghost">
              <RefreshCw aria-hidden className="h-5 w-5" />
              New round
            </button>
          </div>
        </div>
      ) : null}

      {phase === "spider" ? (
        <Spider letters={displayWord.split("")} onDone={() => setPhase("lost")} />
      ) : null}

      {phase === "lost" ? (
        <div className="sort-lost">
          <h2 className="h-display text-3xl">Try again, brave friend!</h2>
          <p>Every sorter wobbles. Tap the button — you&apos;ve got this.</p>
          <div className="sort-reveal-actions">
            <button type="button" onClick={resetRound} className="btn btn-gold btn-lg">
              <RefreshCw aria-hidden className="h-5 w-5" />
              Try this round again
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("bird");
                pop();
                window.setTimeout(() => birdWhoosh(), 200);
                window.setTimeout(() => eagleVoice(), 700);
              }}
              className="btn btn-sky"
            >
              See the eagle anyway
            </button>
          </div>
        </div>
      ) : null}

      <div className="sort-mascot">
        <Mascot mood={mood} message={mascotMsg} nudge={mascotNudge} size={92} />
      </div>
    </div>
  );
}

function DraggableFeather({
  feather,
  isActive,
}: {
  feather: FeatherInstance;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: feather.id,
  });
  const meta = FEATHER_META[feather.type];
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    left: `${feather.x}%`,
    top: `${feather.y}%`,
    rotate: `${feather.rot}deg`,
    cursor: "grab",
    touchAction: "none",
    zIndex: isActive ? 50 : 1,
    ["--feather-color" as string]: meta.color,
    ["--feather-glow" as string]: meta.glow,
  };
  return (
    <button
      ref={setNodeRef}
      style={style}
      className={`sort-feather ${isActive ? "is-dragging" : ""}`}
      aria-label={`${meta.name} feather`}
      {...listeners}
      {...attributes}
    >
      {/* Bold color ring under the feather makes which-color-is-this obvious */}
      <span className="sort-feather-ring" aria-hidden />
      <FeatherSvg type={feather.type} size={72} />
    </button>
  );
}

function NestDrop({
  type,
  placedCount,
  wrong,
}: {
  type: FeatherType;
  placedCount: number;
  wrong: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `nest-${type}` });
  const meta = FEATHER_META[type];
  return (
    <div
      ref={setNodeRef}
      className={`sort-nest ${isOver ? "is-over" : ""} ${wrong ? "is-wrong" : ""}`}
      style={{
        ["--feather-color" as string]: meta.color,
        ["--feather-glow" as string]: meta.glow,
      }}
    >
      <NestSvg type={type} size={120} />
      <span className="sort-nest-label">{meta.name}</span>
      <div className="sort-nest-stack">
        {Array.from({ length: placedCount }).map((_, i) => (
          <span key={i} className="sort-nest-feather">
            <FeatherSvg type={type} size={32} />
          </span>
        ))}
      </div>
    </div>
  );
}
