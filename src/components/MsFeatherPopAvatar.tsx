"use client";

import { useEffect, useState } from "react";
import { onMouthChange } from "@/lib/audio";

export type FeatherPopPose =
  | "idle"
  | "wave"
  | "cheer"
  | "think"
  | "hint"
  | "oops"
  | "wow";

/**
 * Cartoon-style avatar of Ms. Feather Pop, modelled after the brand portrait:
 * brown skin, blue-and-magenta streaked hair with bangs, big feathered wings,
 * denim overalls. Mouth opens/closes in sync with `audio.speak()`.
 */
export function MsFeatherPopAvatar({
  pose = "idle",
  size = 180,
  speaking,
}: {
  pose?: FeatherPopPose;
  size?: number;
  /** If provided, overrides the global mouth-sync subscription. */
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
        <linearGradient id="fp-streak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cd1ff" />
          <stop offset="50%" stopColor="#ff2d8e" />
          <stop offset="100%" stopColor="#3d1aa3" />
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

      {/* WINGS */}
      <g className="fp-wing-left">
        <path
          d="M60 130 Q10 110 6 170 Q20 175 35 168 Q22 190 42 200 Q55 192 60 178 Q52 210 80 212 Q90 198 80 178 Z"
          fill="url(#fp-wing)"
          stroke="#a895d8"
          strokeWidth="1.5"
        />
        {/* feather highlights */}
        <path d="M22 150 q8 8 18 0" stroke="#ff5fa2" strokeWidth="2" fill="none" />
        <path d="M30 175 q8 6 16 -2" stroke="#7cd1ff" strokeWidth="2" fill="none" />
        <path d="M48 195 q6 6 14 -2" stroke="#ff5fa2" strokeWidth="2" fill="none" />
      </g>
      <g className="fp-wing-right">
        <path
          d="M160 130 Q210 110 214 170 Q200 175 185 168 Q198 190 178 200 Q165 192 160 178 Q168 210 140 212 Q130 198 140 178 Z"
          fill="url(#fp-wing)"
          stroke="#a895d8"
          strokeWidth="1.5"
        />
        <path d="M198 150 q-8 8 -18 0" stroke="#7cd1ff" strokeWidth="2" fill="none" />
        <path d="M190 175 q-8 6 -16 -2" stroke="#ff5fa2" strokeWidth="2" fill="none" />
        <path d="M172 195 q-6 6 -14 -2" stroke="#7cd1ff" strokeWidth="2" fill="none" />
      </g>

      {/* BODY - denim overalls */}
      <path
        d="M70 220 Q70 175 110 168 Q150 175 150 220 L150 250 L70 250 Z"
        fill="url(#fp-denim)"
        stroke="#0a1430"
        strokeWidth="2"
      />
      {/* denim straps */}
      <path d="M92 168 L88 200" stroke="#0a1430" strokeWidth="3" fill="none" />
      <path d="M128 168 L132 200" stroke="#0a1430" strokeWidth="3" fill="none" />
      {/* denim notch */}
      <path d="M105 175 L110 188 L115 175" fill="#0a1430" />

      {/* ARMS */}
      {handsUp ? (
        <>
          <path
            d="M78 195 Q40 150 50 110"
            stroke="url(#fp-skin)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M142 195 Q180 150 170 110"
            stroke="url(#fp-skin)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="50" cy="106" r="9" fill="url(#fp-skin)" />
          <circle cx="170" cy="106" r="9" fill="url(#fp-skin)" />
        </>
      ) : handWave ? (
        <>
          <path
            d="M78 195 Q70 170 80 150"
            stroke="url(#fp-skin)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <g className="fp-wave-hand">
            <path
              d="M142 195 Q170 160 160 120"
              stroke="url(#fp-skin)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="160" cy="116" r="9" fill="url(#fp-skin)" />
          </g>
        </>
      ) : (
        <>
          <path
            d="M78 195 Q70 200 75 220"
            stroke="url(#fp-skin)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M142 195 Q150 200 145 220"
            stroke="url(#fp-skin)"
            strokeWidth="14"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* NECK */}
      <rect x="98" y="150" width="24" height="22" fill="url(#fp-skin)" />

      {/* HAIR back */}
      <path
        d="M48 90 Q48 35 110 28 Q172 35 172 90 L168 156 Q140 140 110 140 Q80 140 52 156 Z"
        fill="url(#fp-hair)"
      />

      {/* FACE */}
      <ellipse cx="110" cy="100" rx="42" ry="48" fill="url(#fp-skin)" />

      {/* Cheeks */}
      <circle cx="80" cy="115" r="7" fill="#d65a85" opacity="0.55" />
      <circle cx="140" cy="115" r="7" fill="#d65a85" opacity="0.55" />

      {/* HAIR bangs + side streaks */}
      <path
        d="M58 78 Q72 38 110 42 Q148 38 162 78 Q146 62 132 70 Q120 60 110 64 Q100 60 88 70 Q74 62 58 78 Z"
        fill="url(#fp-hair)"
      />
      {/* blue streak left */}
      <path
        d="M64 80 Q56 110 60 150 L70 152 Q72 116 74 86 Z"
        fill="#3aa5ff"
        opacity="0.85"
      />
      {/* magenta streak right */}
      <path
        d="M150 80 Q160 112 156 152 L146 154 Q144 116 142 86 Z"
        fill="#ff2d8e"
        opacity="0.85"
      />
      {/* bang highlights */}
      <path d="M86 60 Q92 70 100 64" stroke="#7cd1ff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M122 64 Q130 70 136 60" stroke="#ff5fa2" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* EYES */}
      {blink ? (
        <>
          <path d="M88 98 Q95 102 102 98" stroke="#0a0420" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M118 98 Q125 102 132 98" stroke="#0a0420" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* eye whites */}
          <ellipse cx="95" cy="98" rx="6.5" ry="7.5" fill="#fff" />
          <ellipse cx="125" cy="98" rx="6.5" ry="7.5" fill="#fff" />
          {/* pupils */}
          <circle cx="96" cy="99" r="3.6" fill="#0a0420" />
          <circle cx="126" cy="99" r="3.6" fill="#0a0420" />
          {/* sparkle */}
          <circle cx="97.5" cy="97.5" r="1.4" fill="#fff" />
          <circle cx="127.5" cy="97.5" r="1.4" fill="#fff" />
          {/* lashes */}
          <path d="M88 92 q3 -2 6 -1" stroke="#0a0420" strokeWidth="1.6" fill="none" />
          <path d="M118 92 q3 -2 6 -1" stroke="#0a0420" strokeWidth="1.6" fill="none" />
        </>
      )}

      {/* EYEBROWS */}
      {frown ? (
        <>
          <path d="M84 86 L102 90" stroke="#1a0f3a" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M136 86 L118 90" stroke="#1a0f3a" strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M84 88 Q94 82 102 88" stroke="#1a0f3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M118 88 Q126 82 136 88" stroke="#1a0f3a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* MOUTH */}
      {mouthOpen ? (
        <g>
          <ellipse cx="110" cy="126" rx="9" ry="11" fill="#5a0f2a" stroke="#1a0f3a" strokeWidth="1.6" />
          <path d="M101 126 Q110 122 119 126" stroke="#fff" strokeWidth="2" fill="none" />
        </g>
      ) : smile ? (
        <g>
          <path
            d="M93 122 Q110 140 127 122"
            stroke="#1a0f3a"
            strokeWidth="3"
            fill="#a92a4a"
            strokeLinecap="round"
          />
          <path d="M96 124 Q110 134 124 124" fill="#fff" />
        </g>
      ) : frown ? (
        <path
          d="M96 130 Q110 120 124 130"
          stroke="#1a0f3a"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M98 124 Q110 130 122 124"
          stroke="#1a0f3a"
          strokeWidth="3"
          fill="#c44a6e"
          strokeLinecap="round"
        />
      )}

      {/* EARRINGS / sparkle */}
      <circle cx="70" cy="118" r="2.2" fill="#ffd14a" />
      <circle cx="150" cy="118" r="2.2" fill="#ffd14a" />

      {/* Floating feather companion */}
      <g className="fp-floater">
        <path
          d="M195 32 Q188 50 195 70 Q202 50 195 32 Z"
          fill="#ff5fa2"
          stroke="#3d1aa3"
          strokeWidth="1.2"
        />
        <line x1="195" y1="34" x2="195" y2="68" stroke="#3d1aa3" strokeWidth="1" />
      </g>

      {/* sparkles */}
      <g className="fp-spark">
        <path
          d="M30 40 L33 50 L43 53 L33 56 L30 66 L27 56 L17 53 L27 50 Z"
          fill="#ffd14a"
        />
      </g>
    </svg>
  );
}
