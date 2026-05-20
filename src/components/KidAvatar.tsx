"use client";

import { useEffect, useState } from "react";

export type KidKind = "ari" | "bee" | "kai" | "lila" | "mo" | "zara";
export type KidPose = "idle" | "wave" | "cheer" | "read" | "jump";

const PALETTE: Record<
  KidKind,
  { skin: string; hair: string; shirt: string; accent: string; label: string }
> = {
  ari:  { skin: "#f3c89a", hair: "#3a1a1a", shirt: "#ff2d8e", accent: "#ffd14a", label: "Ari" },
  bee:  { skin: "#7a4a31", hair: "#1a0a0a", shirt: "#34e3a4", accent: "#ff2d8e", label: "Bee" },
  kai:  { skin: "#d99770", hair: "#2a1a4d", shirt: "#4cc4ff", accent: "#ffd14a", label: "Kai" },
  lila: { skin: "#f7d6b3", hair: "#b13bff", shirt: "#ffd14a", accent: "#ff2d8e", label: "Lila" },
  mo:   { skin: "#8a5a3a", hair: "#0d0d0d", shirt: "#6a2dff", accent: "#34e3a4", label: "Mo" },
  zara: { skin: "#5a3320", hair: "#1a0a3a", shirt: "#ff7ab8", accent: "#7cd1ff", label: "Zara" },
};

export const ALL_KIDS: KidKind[] = ["ari", "bee", "kai", "lila", "mo", "zara"];

/**
 * A cartoon kid avatar — small, big-head chibi style with a pose animation.
 * Six variants chosen for skin/hair diversity; each one bobs/jumps/waves.
 */
export function KidAvatar({
  kid,
  pose = "idle",
  size = 88,
  delay = 0,
}: {
  kid: KidKind;
  pose?: KidPose;
  size?: number;
  /** Animation delay in ms — handy when staggering a row of kids. */
  delay?: number;
}) {
  const c = PALETTE[kid];
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 140);
    }, 2800 + Math.random() * 1800);
    return () => window.clearInterval(id);
  }, []);

  const smile = pose === "cheer" || pose === "wave" || pose === "jump";

  return (
    <svg
      viewBox="0 0 120 150"
      width={size}
      height={(size * 150) / 120}
      role="img"
      aria-label={`${c.label} kid avatar`}
      className={`kid kid-${kid} kid-pose-${pose}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <defs>
        <linearGradient id={`shirt-${kid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.shirt} stopOpacity="1" />
          <stop offset="100%" stopColor={shade(c.shirt, -20)} />
        </linearGradient>
      </defs>

      {/* Legs */}
      <g className="kid-legs">
        <rect x="46" y="115" width="10" height="22" rx="4" fill={shade(c.shirt, -35)} />
        <rect x="64" y="115" width="10" height="22" rx="4" fill={shade(c.shirt, -35)} />
        <rect x="44" y="135" width="14" height="6" rx="2" fill="#1a0f3a" />
        <rect x="62" y="135" width="14" height="6" rx="2" fill="#1a0f3a" />
      </g>

      {/* Body / shirt */}
      <path
        d="M36 92 Q60 80 84 92 L82 122 L38 122 Z"
        fill={`url(#shirt-${kid})`}
        stroke={shade(c.shirt, -40)}
        strokeWidth="1.5"
      />

      {/* Arms */}
      {pose === "cheer" || pose === "jump" ? (
        <>
          <path
            d="M40 96 Q22 68 26 50"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 96 Q98 68 94 50"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="26" cy="48" r="6" fill={c.skin} />
          <circle cx="94" cy="48" r="6" fill={c.skin} />
        </>
      ) : pose === "wave" ? (
        <>
          <path
            d="M40 96 Q34 110 38 122"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <g className="kid-wave">
            <path
              d="M80 96 Q100 78 92 56"
              stroke={c.skin}
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="92" cy="54" r="6" fill={c.skin} />
          </g>
        </>
      ) : pose === "read" ? (
        <>
          <path
            d="M40 96 Q48 102 56 100"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 96 Q72 102 64 100"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          {/* Book */}
          <rect x="46" y="98" width="28" height="18" rx="2" fill="#fff" stroke="#1a0f3a" strokeWidth="1.5" />
          <line x1="60" y1="99" x2="60" y2="115" stroke="#1a0f3a" strokeWidth="1" />
          <line x1="50" y1="104" x2="56" y2="104" stroke="#b13bff" strokeWidth="1" />
          <line x1="64" y1="104" x2="70" y2="104" stroke="#b13bff" strokeWidth="1" />
        </>
      ) : (
        <>
          <path
            d="M40 96 Q32 110 36 122"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M80 96 Q88 110 84 122"
            stroke={c.skin}
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* Neck */}
      <rect x="55" y="78" width="10" height="10" fill={c.skin} />

      {/* Hair back */}
      <ellipse cx="60" cy="50" rx="30" ry="32" fill={c.hair} />

      {/* Head */}
      <circle cx="60" cy="52" r="26" fill={c.skin} />

      {/* Hair front (varies by kid) */}
      {kid === "ari" || kid === "lila" ? (
        // ponytail / side braid
        <>
          <path d="M34 42 Q38 28 60 24 Q82 28 86 42 Q70 36 60 38 Q50 36 34 42 Z" fill={c.hair} />
          <ellipse cx="32" cy="60" rx="6" ry="14" fill={c.hair} />
        </>
      ) : kid === "bee" || kid === "zara" ? (
        // curly puff
        <>
          <circle cx="40" cy="34" r="9" fill={c.hair} />
          <circle cx="52" cy="28" r="10" fill={c.hair} />
          <circle cx="68" cy="28" r="10" fill={c.hair} />
          <circle cx="80" cy="34" r="9" fill={c.hair} />
          <circle cx="48" cy="40" r="7" fill={c.hair} />
          <circle cx="72" cy="40" r="7" fill={c.hair} />
        </>
      ) : (
        // short bangs
        <path d="M36 40 Q44 24 60 26 Q76 24 84 40 Q70 32 60 36 Q50 32 36 40 Z" fill={c.hair} />
      )}

      {/* Eyes */}
      {blink ? (
        <>
          <path d="M48 54 Q52 57 56 54" stroke="#0a0420" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M64 54 Q68 57 72 54" stroke="#0a0420" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="52" cy="54" rx="3.5" ry="4.5" fill="#0a0420" />
          <ellipse cx="68" cy="54" rx="3.5" ry="4.5" fill="#0a0420" />
          <circle cx="53" cy="53" r="1.2" fill="#fff" />
          <circle cx="69" cy="53" r="1.2" fill="#fff" />
        </>
      )}

      {/* Cheeks */}
      <circle cx="44" cy="64" r="3.5" fill="#ff8aa6" opacity="0.6" />
      <circle cx="76" cy="64" r="3.5" fill="#ff8aa6" opacity="0.6" />

      {/* Mouth */}
      {smile ? (
        <path
          d="M50 67 Q60 76 70 67"
          stroke="#1a0f3a"
          strokeWidth="2"
          fill="#a92a4a"
          strokeLinecap="round"
        />
      ) : pose === "read" ? (
        <path
          d="M52 70 Q60 73 68 70"
          stroke="#1a0f3a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : (
        <ellipse cx="60" cy="69" rx="5" ry="3" fill="#a92a4a" />
      )}

      {/* Accent dot (badge / bow / sparkle) */}
      <circle cx="86" cy="34" r="3.2" fill={c.accent} />
    </svg>
  );
}

/** Helper: lighten/darken a hex color by `amt` (positive=lighter). */
function shade(hex: string, amt: number) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = clamp(parseInt(m.slice(0, 2), 16) + amt);
  const g = clamp(parseInt(m.slice(2, 4), 16) + amt);
  const b = clamp(parseInt(m.slice(4, 6), 16) + amt);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}

/** Row of staggered kid avatars — used to dress up cards and reward bursts. */
export function KidRow({
  kids = ALL_KIDS,
  pose = "wave",
  size = 64,
}: {
  kids?: KidKind[];
  pose?: KidPose;
  size?: number;
}) {
  return (
    <div className="kid-row">
      {kids.map((k, i) => (
        <KidAvatar key={k} kid={k} pose={pose} size={size} delay={i * 120} />
      ))}
    </div>
  );
}
