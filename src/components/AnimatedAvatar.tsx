"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Render priority (auto-fallback chain):
 *   1. /public/<baseSrc>.sprite.png — transparent CSS sprite sheet (preferred)
 *   2. /public/<baseSrc>.mp4        — looped video
 *   3. /public/<baseSrc>.webm
 *   4. /public/<baseSrc>.gif        — animated GIF
 *   5. /public/<baseSrc>.png        — static image
 *   6. <fallback> children          — inline SVG or anything else
 *
 * Sprite sheets are preferred because source videos came with a baked teal
 * background and this ffmpeg build can't alpha-encode WebM. The sprite path
 * runs AI background removal per frame and stitches into a transparent PNG
 * that CSS animates via `steps()`.
 *
 * SPRITE_FRAMES + SPRITE_FRAME_SIZE must match scripts/video-to-sprite.mjs.
 */
const SPRITE_FRAMES = 12;
const SPRITE_FRAME_SIZE = 360;
const SPRITE_DURATION_S = 1.4;

export function AnimatedAvatar({
  baseSrc,
  width,
  height,
  alt,
  className,
  style,
  fallback,
}: {
  baseSrc: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const [kind, setKind] = useState<
    "probing" | "sprite" | "mp4" | "webm" | "gif" | "png" | "missing"
  >("probing");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const order: Array<["sprite" | "mp4" | "webm" | "gif" | "png", string]> = [
        ["sprite", `${baseSrc}.sprite.png`],
        ["mp4", `${baseSrc}.mp4`],
        ["webm", `${baseSrc}.webm`],
        ["gif", `${baseSrc}.gif`],
        ["png", `${baseSrc}.png`],
      ];
      for (const [type, url] of order) {
        try {
          const r = await fetch(url, { method: "HEAD" });
          if (r.ok) {
            if (!cancelled) setKind(type);
            return;
          }
        } catch {
          /* try next */
        }
      }
      if (!cancelled) setKind("missing");
    })();
    return () => {
      cancelled = true;
    };
  }, [baseSrc]);

  // Kick video on mount
  useEffect(() => {
    if ((kind === "mp4" || kind === "webm") && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [kind]);

  if (kind === "probing") {
    return <div style={{ width, height, ...style }} className={className} aria-hidden />;
  }
  if (kind === "missing") return <>{fallback}</>;

  if (kind === "sprite") {
    // CSS animation plays through the strip frame-by-frame
    return (
      <div
        className={`sprite-anim ${className ?? ""}`}
        role="img"
        aria-label={alt}
        style={{
          width,
          height,
          backgroundImage: `url(${baseSrc}.sprite.png)`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${SPRITE_FRAMES * 100}% 100%`,
          animation: `sprite-play-${SPRITE_FRAMES} ${SPRITE_DURATION_S}s steps(${SPRITE_FRAMES}, jump-none) infinite`,
          // hint to the browser for crisp pixel-snapping
          imageRendering: "auto",
          ...style,
        }}
      />
    );
  }

  if (kind === "mp4" || kind === "webm") {
    return (
      <video
        ref={videoRef}
        src={`${baseSrc}.${kind}`}
        width={width}
        height={height}
        autoPlay
        loop
        muted
        playsInline
        poster={`${baseSrc}.png`}
        aria-label={alt}
        className={className}
        style={{ objectFit: "contain", ...style }}
      />
    );
  }

  const src = `${baseSrc}.${kind}`;
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      priority
      className={className}
      style={{ objectFit: "contain", ...style }}
    />
  );
}
