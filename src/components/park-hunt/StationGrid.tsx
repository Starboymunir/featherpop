"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { buzz, childCheer, ding, fanfare, pop, wordReveal } from "@/lib/audio";
import { STATION_THEMES, getStationLabel } from "@/lib/park-hunt";
import { Confetti } from "@/components/Confetti";
import { findWordAtStationAction } from "@/lib/park-hunt-actions";
import { EggHatchReveal } from "@/components/eggs/EggHatchReveal";
import { EggCrackReveal } from "@/components/eggs/EggCrackReveal";
import type { EggColor, HatchedEntry } from "@/lib/child-profile";

/**
 * Park Hunt station result.
 *
 * After scanning the right station we reveal its 20 words with the eagle's
 * word HIGHLIGHTED. The child taps the glowing word (a confirmation that they
 * found it at the park) → it awards the feather and takes them to Letter Pop
 * to spell it. If the eagle's word isn't in this station, we tell them to scan
 * a different QR.
 */
export function StationGrid({
  stationId,
  word,
  matchesStation,
  stationWords,
  locked = false,
}: {
  stationId: number; // 0-indexed (display +1)
  word: string | null;
  matchesStation: boolean;
  stationWords: string[];
  locked?: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"finding" | "limit">("finding");
  const [confettiKey, setConfettiKey] = useState(0);
  const [wrongTap, setWrongTap] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hatched, setHatched] = useState<HatchedEntry | null>(null);
  const [crackMilestone, setCrackMilestone] = useState<{
    level: number;
    label: string;
    message: string;
    color: EggColor;
    wordsInEgg: number;
    wordsToHatch: number;
  } | null>(null);
  const doneRef = useRef(false);

  const goLetterPop = useCallback(() => {
    router.push(`/play?word=${encodeURIComponent(word ?? "")}`);
  }, [router, word]);

  // Shuffle the 20 words once so the target isn't always in the same spot.
  const shuffled = useMemo(() => {
    const a = stationWords.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, [stationWords]);

  const handleTap = useCallback(
    async (tapped: string) => {
      if (!word || submitting || doneRef.current) return;
      if (tapped !== word) {
        buzz();
        setWrongTap(tapped);
        setHint("Tap the glowing word you found!");
        window.setTimeout(() => setWrongTap(null), 450);
        return;
      }
      // Correct word tapped — award, celebrate, then head to Letter Pop.
      doneRef.current = true;
      setSubmitting(true);
      ding(1320, 90);
      setConfettiKey((k) => k + 1);
      pop();
      window.setTimeout(() => wordReveal(), 120);
      window.setTimeout(() => fanfare(), 500);
      window.setTimeout(() => childCheer(), 1000);

      const res = await findWordAtStationAction({ word, stationId }).catch(
        () => null,
      );
      if (res && !res.ok && res.limit) {
        setPhase("limit");
        setSubmitting(false);
        return;
      }
      // Show a hatch/crack reveal first (if any); its close continues to
      // Letter Pop. Otherwise go straight there.
      if (res && res.ok && res.hatched) {
        setHatched(res.hatched);
      } else if (res && res.ok && res.crackJustCrossed) {
        setCrackMilestone(res.crackJustCrossed);
      } else {
        window.setTimeout(goLetterPop, 700);
      }
    },
    [word, submitting, stationId, goLetterPop],
  );

  // No word in the URL → the child hasn't been handed one by the eagle.
  if (!word) {
    return (
      <div className="parkhunt-station parkhunt-station-empty">
        <h2 className="h-display text-3xl">
          <span className="h-gradient">No word to hunt yet!</span>
        </h2>
        <p>
          Play <strong>Feather Match</strong> first — the eagle will give you a
          word to find at the park.
        </p>
        <div className="parkhunt-station-actions">
          <Link href="/sort" className="btn btn-gold btn-lg">
            <Wand2 aria-hidden className="h-5 w-5" />
            Play Feather Match
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    );
  }

  // Wrong station — the eagle's word isn't here.
  if (!matchesStation) {
    return (
      <div className="parkhunt-station parkhunt-station-empty">
        <h2 className="h-display text-3xl">
          <span className="h-gradient">Not at this station!</span>
        </h2>
        <p>
          <strong>{word}</strong> isn&apos;t at{" "}
          <strong>{getStationLabel(stationId)}</strong>. Walk around the park
          and scan a different QR code.
        </p>
        <div className="parkhunt-station-actions">
          <Link
            href={`/scan?word=${encodeURIComponent(word)}`}
            className="btn btn-gold btn-lg"
          >
            <Camera aria-hidden className="h-5 w-5" />
            Scan another QR
          </Link>
          <Link
            href={`/park-hunt?word=${encodeURIComponent(word)}`}
            className="btn btn-ghost"
          >
            <RefreshCw aria-hidden className="h-5 w-5" />
            Back to the Eagle
          </Link>
        </div>
      </div>
    );
  }

  // Correct station BUT the free daily Park Hunt limit is used up.
  if (locked || phase === "limit") {
    return (
      <div className="parkhunt-station parkhunt-station-empty">
        <h2 className="h-display text-3xl">
          <span className="h-gradient">You found it! 🎉</span>
        </h2>
        <p>
          <strong>{word}</strong> was here — but you&apos;ve used your{" "}
          <strong>3 free Park Hunts</strong> today. Subscribe for{" "}
          <strong>$9.99/month</strong> to hunt unlimited and claim prizes.
        </p>
        <div className="parkhunt-station-actions">
          <Link href="/membership" className="btn btn-gold btn-lg">
            <Sparkles aria-hidden className="h-5 w-5" />
            See membership
          </Link>
          <Link href="/" className="btn btn-ghost">
            Home
          </Link>
        </div>
      </div>
    );
  }

  // Reveal the 20 words; the eagle's word is highlighted. Tap it → Letter Pop.
  return (
    <div className="parkhunt-station">
      <Confetti trigger={confettiKey} pieces={70} />

      {hatched ? (
        <EggHatchReveal hatched={hatched} onClose={goLetterPop} />
      ) : crackMilestone ? (
        <EggCrackReveal {...crackMilestone} onClose={goLetterPop} />
      ) : null}

      <header className="parkhunt-station-hud">
        <span className="kicker">
          {STATION_THEMES[stationId]?.emoji ?? "🪶"}{" "}
          {getStationLabel(stationId)}
        </span>
        <p className="parkhunt-station-find">
          You found <strong>{word}</strong>! Tap it to keep going →
        </p>
      </header>

      <div className="parkhunt-grid">
        {shuffled.map((w) => {
          const isTarget = w === word;
          return (
            <button
              key={w}
              type="button"
              disabled={submitting}
              onClick={() => handleTap(w)}
              className={`parkhunt-word ${isTarget ? "is-target" : ""} ${
                wrongTap === w ? "is-wrong" : ""
              }`}
              aria-label={isTarget ? `Your word ${w}` : `Word ${w}`}
            >
              {w}
            </button>
          );
        })}
      </div>

      {hint ? <p className="parkhunt-station-hint">{hint}</p> : null}
    </div>
  );
}
