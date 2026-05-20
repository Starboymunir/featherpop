"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, SkipForward } from "lucide-react";
import { speak } from "@/lib/audio";
import { MsFeatherPopAvatar } from "@/components/MsFeatherPopAvatar";
import { KidRow } from "@/components/KidAvatar";

const VIDEO_SRC = "/media/intro.mp4"; // optional asset; falls back to poster image

export default function IntroPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    // detect whether the optional intro video exists
    fetch(VIDEO_SRC, { method: "HEAD" })
      .then((r) => setHasVideo(r.ok))
      .catch(() => setHasVideo(false));
  }, []);

  function play() {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
      return;
    }
    setPlaying(true);
    speak("Welcome to Ms. Feather Pop's Word Quest! Let's discover letters and build amazing words.");
  }

  return (
    <main className="page">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="kicker">Step 1 · Welcome</span>
          <h1 className="h-display mt-2 text-4xl md:text-5xl">
            <span className="h-gradient">Meet Ms. Feather Pop</span>
          </h1>
        </div>
        <Link href="/scan" className="btn btn-ghost btn-sm">
          <SkipForward aria-hidden className="h-4 w-4" />
          Skip
        </Link>
      </header>

      <section className="card overflow-hidden p-0">
        <div className="relative aspect-video bg-[var(--ink)]">
          {hasVideo ? (
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster="/media/poster.jpeg"
              controls={playing}
              playsInline
              onEnded={() => setPlaying(false)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="fp-stage absolute inset-0">
              <MsFeatherPopAvatar pose="wave" size={260} />
            </div>
          )}

          {!playing ? (
            <button
              type="button"
              onClick={play}
              aria-label="Play intro"
              className="absolute inset-0 grid place-items-center bg-black/35 transition-colors hover:bg-black/45"
            >
              <span
                className="grid h-24 w-24 place-items-center rounded-full text-[var(--ink)] shadow-2xl"
                style={{ background: "linear-gradient(135deg, #ffe27a, var(--gold))" }}
              >
                <Play aria-hidden className="h-12 w-12 fill-current" />
              </span>
            </button>
          ) : null}
        </div>

        <div className="p-5 md:p-6">
          <div className="kid-stage mb-4">
            <KidRow pose="cheer" size={64} />
          </div>
          <p className="text-[var(--ink-soft)]">
            {hasVideo
              ? "Press play to watch the welcome toon, then head to the scanner to start your first quest."
              : "Drop your toon-style intro at /public/media/intro.mp4 and it will appear here. For now, hit play for a friendly welcome message and move on to scanning."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/scan" className="btn btn-primary">
              Open Scanner
              <ArrowRight aria-hidden className="h-5 w-5" />
            </Link>
            <Link href="/how-to-play" className="btn btn-ghost">
              How to Play
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
