"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";
import { childCheer, fanfare, pop } from "@/lib/audio";

const AVATAR_OPTIONS = [
  "kid-ari",
  "kid-bee",
  "kid-kai",
  "kid-lila",
  "kid-mo",
  "kid-zara",
];

interface Props {
  addChildAction: (fd: FormData) => Promise<{ id: string } | null>;
}

/**
 * One-step onboarding: enter a child nickname + avatar → straight to home.
 * (No parent-PIN step — removed per client.)
 */
export function WelcomeWizard({ addChildAction }: Props) {
  const router = useRouter();
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [adding, setAdding] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  async function handleAdd(fd: FormData) {
    setAdding(true);
    try {
      fd.set("avatar", avatar);
      // addChildAction sets the active-child cookie server-side, so home
      // renders straight away.
      await addChildAction(fd);
      setConfettiKey((k) => k + 1);
      pop();
      window.setTimeout(() => childCheer(), 200);
      window.setTimeout(() => fanfare(), 500);
      router.push("/");
      router.refresh();
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="card welcome-card">
      <Confetti trigger={confettiKey} pieces={60} />
      <div className="welcome-mascot">
        <MsFeatherPopAvatar pose="wave" size={120} />
      </div>
      <span className="kicker">
        <Sparkles aria-hidden className="h-4 w-4" />
        Welcome
      </span>
      <h1 className="h-display mt-2 text-3xl">
        <span className="h-gradient">Add your child</span>
      </h1>
      <p className="text-[var(--ink-soft)]">
        Pick a nickname and an avatar — then you&apos;re in!
      </p>

      <form action={handleAdd} className="mt-5 grid gap-3 max-w-sm">
        <label className="grid gap-1">
          <span className="kicker">Child nickname</span>
          <input
            required
            name="nickname"
            maxLength={20}
            className="profile-input"
            placeholder="e.g. Sam"
          />
        </label>
        <span className="kicker">Choose an avatar</span>
        <div className="avatar-grid">
          {AVATAR_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt}
              className={`avatar-pick ${avatar === opt ? "is-active" : ""}`}
              onClick={() => setAvatar(opt)}
              aria-label={opt}
            >
              <Image
                src={`/media/avatars/${opt}-wave.png`}
                alt=""
                width={64}
                height={64}
                unoptimized
              />
            </button>
          ))}
        </div>
        <button type="submit" className="btn btn-gold mt-2" disabled={adding}>
          {adding ? "Adding…" : "Let's go!"}
          <ArrowRight aria-hidden className="h-5 w-5" />
        </button>
      </form>
    </section>
  );
}
