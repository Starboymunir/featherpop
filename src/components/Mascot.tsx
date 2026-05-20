"use client";

import { useEffect, useState } from "react";
import { FeatherPopPose, MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";

export type MascotMood =
  | "idle"
  | "think"
  | "cheer"
  | "wow"
  | "oops"
  | "hint";

const MESSAGES: Record<MascotMood, string[]> = {
  idle: [
    "Tap a letter to start spelling!",
    "You can do this, Word Explorer!",
    "Listen for the letter sound as you tap.",
  ],
  think: [
    "Hmm, look at the letters carefully…",
    "Try moving them in a new order.",
    "Read the slots out loud!",
  ],
  hint: [
    "Need a clue? Use the hint button!",
    "Here's a tip — sound it out slowly.",
    "Each letter makes a sound. Mix them!",
  ],
  oops: [
    "Almost! Try a different letter.",
    "Don't give up — you've got this!",
    "Oops! Tap a slot to remove a letter.",
    "Let's try again, friend!",
  ],
  cheer: [
    "Woohoo! You did it!",
    "Amazing spelling!",
    "Word Champion in the house!",
    "FeatherPop earned!",
  ],
  wow: [
    "Bonus word! Brilliant!",
    "Wow — you found a hidden word!",
    "Extra FeatherPop for you!",
  ],
};

const POSE_FOR: Record<MascotMood, { pose: FeatherPopPose; tilt: number; bob: string }> = {
  idle:  { pose: "idle",  tilt: -2, bob: "mascot-bob" },
  think: { pose: "think", tilt:  4, bob: "mascot-tilt" },
  hint:  { pose: "hint",  tilt: -4, bob: "mascot-bob" },
  oops:  { pose: "oops",  tilt: -8, bob: "mascot-shake" },
  cheer: { pose: "cheer", tilt:  0, bob: "mascot-cheer" },
  wow:   { pose: "wow",   tilt:  6, bob: "mascot-cheer" },
};

export function Mascot({
  mood,
  message,
  nudge,
}: {
  mood: MascotMood;
  message?: string;
  nudge?: number;
}) {
  const [line, setLine] = useState(message ?? MESSAGES[mood][0]);

  useEffect(() => {
    if (message) {
      setLine(message);
      return;
    }
    const opts = MESSAGES[mood];
    setLine(opts[Math.floor(Math.random() * opts.length)]);
  }, [mood, message, nudge]);

  const cfg = POSE_FOR[mood];

  return (
    <div className="mascot" data-mood={mood}>
      <div className="mascot-bubble" key={`${mood}-${nudge ?? 0}`}>
        <p>{line}</p>
        <span className="mascot-bubble-tail" aria-hidden />
      </div>
      <div
        className={`mascot-figure ${cfg.bob}`}
        style={{ transform: `rotate(${cfg.tilt}deg)` }}
      >
        <MsFeatherPopAvatar pose={cfg.pose} size={120} />
      </div>
    </div>
  );
}
