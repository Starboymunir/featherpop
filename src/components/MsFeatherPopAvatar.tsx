"use client";

import { useEffect, useState } from "react";
import { onMouthChange } from "@/lib/audio";
import { AnimatedAvatar } from "@/components/AnimatedAvatar";

export type FeatherPopPose =
  | "idle"
  | "wave"
  | "cheer"
  | "think"
  | "hint"
  | "oops"
  | "wow";

/**
 * Ms. Feather Pop avatar. Renders the first asset that exists at:
 *   /media/avatars/feather-pop-<pose>.mp4   ← video (preferred — animated, smallest)
 *   /media/avatars/feather-pop-<pose>.webm
 *   /media/avatars/feather-pop-<pose>.gif
 *   /media/avatars/feather-pop-<pose>.png   ← static image (current state)
 *   inline SVG fallback                      ← last resort
 */
export function MsFeatherPopAvatar({
  pose = "idle",
  size = 180,
  speaking,
}: {
  pose?: FeatherPopPose;
  size?: number;
  speaking?: boolean;
}) {
  // Sprite frames are square (360×360 after ffmpeg padding), so the
  // container is square too. The original 220×260 aspect was for the
  // hand-drawn inline SVG only — passing it to the sprite caused
  // horizontal compression.
  return (
    <AnimatedAvatar
      baseSrc={`/media/avatars/feather-pop-${pose}`}
      width={size}
      height={size}
      alt="Ms. Feather Pop"
      className={`fp-avatar-wrap fp-pose-${pose}`}
      fallback={<InlineSvgAvatar pose={pose} size={size} speaking={speaking} />}
    />
  );
}

/** Always-available inline SVG (last-resort fallback). */
function InlineSvgAvatar({
  pose,
  size,
  speaking,
}: {
  pose: FeatherPopPose;
  size: number;
  speaking?: boolean;
}) {
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (speaking !== undefined) {
      setMouthOpen(speaking);
      return;
    }
    return onMouthChange(setMouthOpen);
  }, [speaking]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 150);
    }, 3500 + Math.random() * 1500);
    return () => window.clearInterval(id);
  }, []);

  const smile = pose === "cheer" || pose === "wow" || pose === "wave";
  const frown = pose === "oops";
  const handsUp = pose === "cheer" || pose === "wow";
  const handWave = pose === "wave" || pose === "hint";

  return (
    <svg
      viewBox="0 0 220 260"
      width={size}
      height={(size * 260) / 220}
      role="img"
      aria-label="Ms. Feather Pop"
      className={`fp-avatar fp-pose-${pose}`}
    >
      <defs>
        <linearGradient id="fp-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1f7a" />
          <stop offset="35%" stopColor="#2a37c8" />
          <stop offset="55%" stopColor="#7b22c4" />
          <stop offset="80%" stopColor="#ff2d8e" />
          <stop offset="100%" stopColor="#5a1e8a" />
        </linearGradient>
        <linearGradient id="fp-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a4a31" />
          <stop offset="100%" stopColor="#5a3320" />
        </linearGradient>
        <linearGradient id="fp-denim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3f78" />
          <stop offset="100%" stopColor="#0f1f4d" />
        </linearGradient>
        <radialGradient id="fp-wing" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e7d8ff" />
        </radialGradient>
      </defs>

      <g className="fp-wing-left">
        <path d="M60 130 Q10 110 6 170 Q20 175 35 168 Q22 190 42 200 Q55 192 60 178 Q52 210 80 212 Q90 198 80 178 Z" fill="url(#fp-wing)" stroke="#a895d8" strokeWidth="1.5" />
      </g>
      <g className="fp-wing-right">
        <path d="M160 130 Q210 110 214 170 Q200 175 185 168 Q198 190 178 200 Q165 192 160 178 Q168 210 140 212 Q130 198 140 178 Z" fill="url(#fp-wing)" stroke="#a895d8" strokeWidth="1.5" />
      </g>

      <path d="M70 220 Q70 175 110 168 Q150 175 150 220 L150 250 L70 250 Z" fill="url(#fp-denim)" stroke="#0a1430" strokeWidth="2" />

      {handsUp ? (
        <>
          <path d="M78 195 Q40 150 50 110" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M142 195 Q180 150 170 110" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
        </>
      ) : handWave ? (
        <>
          <path d="M78 195 Q70 170 80 150" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M142 195 Q170 160 160 120" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M78 195 Q70 200 75 220" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M142 195 Q150 200 145 220" stroke="url(#fp-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
        </>
      )}

      <rect x="98" y="150" width="24" height="22" fill="url(#fp-skin)" />
      <ellipse cx="110" cy="100" rx="42" ry="48" fill="url(#fp-skin)" />
      <path d="M58 78 Q72 38 110 42 Q148 38 162 78 Q146 62 132 70 Q120 60 110 64 Q100 60 88 70 Q74 62 58 78 Z" fill="url(#fp-hair)" />

      {blink ? (
        <>
          <path d="M88 98 Q95 102 102 98" stroke="#0a0420" strokeWidth="3" fill="none" />
          <path d="M118 98 Q125 102 132 98" stroke="#0a0420" strokeWidth="3" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="95" cy="98" rx="6.5" ry="7.5" fill="#fff" />
          <ellipse cx="125" cy="98" rx="6.5" ry="7.5" fill="#fff" />
          <circle cx="96" cy="99" r="3.6" fill="#0a0420" />
          <circle cx="126" cy="99" r="3.6" fill="#0a0420" />
        </>
      )}

      {mouthOpen ? (
        <ellipse cx="110" cy="126" rx="9" ry="11" fill="#5a0f2a" stroke="#1a0f3a" strokeWidth="1.6" />
      ) : smile ? (
        <path d="M93 122 Q110 140 127 122" stroke="#1a0f3a" strokeWidth="3" fill="#a92a4a" />
      ) : frown ? (
        <path d="M96 130 Q110 120 124 130" stroke="#1a0f3a" strokeWidth="3" fill="none" />
      ) : (
        <path d="M98 124 Q110 130 122 124" stroke="#1a0f3a" strokeWidth="3" fill="#c44a6e" />
      )}
    </svg>
  );
}
