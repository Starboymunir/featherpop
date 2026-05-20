// Audio engine for Ms. Feather Pop. Everything is synthesised on the fly with
// WebAudio so we never need to ship binary audio files. Provides:
//   - speak() with mouth-sync callback (drives the cartoon mascot's mouth)
//   - ding/buzz/fanfare/cheer kid-style SFX
//   - startMusic()/stopMusic() looping arcade tune for in-game ambiance
//   - tick() countdown blip
//   - childCheer() pseudo-vocal "yay!" using FM-style chirps

const SOUND_KEY = "ms-feather-pop-sound";
const MUSIC_KEY = "ms-feather-pop-music";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  if (!enabled) stopMusic();
}

export function isMusicEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(MUSIC_KEY);
  return v === null ? true : v === "1";
}

export function setMusicEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MUSIC_KEY, enabled ? "1" : "0");
  if (!enabled) stopMusic();
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!isSoundEnabled()) return null;
  type WindowWithWebkit = typeof window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const w = window as WindowWithWebkit;
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

/* -------------------- Speech with mouth sync -------------------- */

type MouthListener = (open: boolean) => void;
const mouthListeners = new Set<MouthListener>();
let mouthTimer: number | null = null;

export function onMouthChange(fn: MouthListener) {
  mouthListeners.add(fn);
  return () => {
    mouthListeners.delete(fn);
  };
}

function emitMouth(open: boolean) {
  mouthListeners.forEach((fn) => fn(open));
}

function startMouthFlapping() {
  if (mouthTimer != null) return;
  let open = false;
  mouthTimer = window.setInterval(() => {
    open = !open;
    emitMouth(open);
  }, 110);
}

function stopMouthFlapping() {
  if (mouthTimer != null) {
    window.clearInterval(mouthTimer);
    mouthTimer = null;
  }
  emitMouth(false);
}

export function speak(message: string, opts?: { kid?: boolean }) {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    // Default to kid voice (higher pitch, slightly faster)
    const isKid = opts?.kid !== false;
    u.rate = isKid ? 1.08 : 1;
    u.pitch = isKid ? 1.8 : 1.2; // max is 2 — really pushes toward kid timbre
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    // Prefer voices that tend to read kid-friendly
    const preferred =
      voices.find((v) => /child|kid|kids/i.test(v.name)) ??
      voices.find((v) =>
        /samantha|jenny|aria|zira|google us english female|microsoft eva|microsoft mark/i.test(
          v.name,
        ),
      ) ??
      voices.find((v) => v.lang?.startsWith("en"));
    if (preferred) u.voice = preferred;
    u.onstart = startMouthFlapping;
    u.onend = stopMouthFlapping;
    u.onerror = stopMouthFlapping;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  stopMouthFlapping();
}

/* -------------------- Tone helpers -------------------- */

function tone(
  freq: number,
  durationMs: number,
  type: OscillatorType = "sine",
  startGain = 0.22,
  delay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(startGain, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.05);
}

function chirp(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  type: OscillatorType = "triangle",
  startGain = 0.25,
  delay = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const dur = durationMs / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 30), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(startGain, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/* -------------------- One-shot SFX -------------------- */

export function ding(frequency = 880, durationMs = 140) {
  tone(frequency, durationMs, "triangle", 0.22);
}

export function pop() {
  chirp(420, 1100, 130, "triangle", 0.25);
}

export function fanfare() {
  chirp(440, 660, 150, "triangle", 0.25, 0);
  chirp(660, 990, 150, "triangle", 0.25, 0.15);
  chirp(880, 1320, 260, "triangle", 0.28, 0.3);
  childCheer(0.55);
}

export function buzz() {
  chirp(280, 110, 220, "sawtooth", 0.2);
}

export function tick() {
  tone(720, 60, "square", 0.12);
}

/** Last-10-seconds urgency blip — higher pitch. */
export function urgentTick() {
  tone(980, 80, "square", 0.18);
}

/** Pseudo-vocal kid cheer using fast vowel-like formant chirps. */
export function childCheer(delay = 0) {
  // "Yaaay!" — quick rising vowel
  chirp(520, 980, 320, "triangle", 0.28, delay);
  chirp(720, 1180, 280, "sine", 0.18, delay + 0.05);
  // little giggle tail
  chirp(880, 660, 140, "triangle", 0.18, delay + 0.4);
  chirp(990, 760, 140, "triangle", 0.18, delay + 0.56);
}

/** Small child "ooh!" used for hint/bonus reveals. */
export function childOoh() {
  chirp(380, 720, 260, "sine", 0.22);
}

/** A bubbly kid giggle — staccato up-down chirps. */
export function childGiggle() {
  const beats = [
    [780, 980, 110],
    [720, 920, 100],
    [820, 1020, 110],
    [700, 880, 110],
    [880, 1100, 130],
  ];
  beats.forEach(([a, b, d], i) => {
    chirp(a, b, d, "triangle", 0.22, i * 0.13);
  });
}

/** Crowd of kids saying "yay!" — multiple stacked cheers at offset pitches. */
export function kidCrowdCheer() {
  childCheer(0);
  childCheer(0.08);
  childCheer(0.14);
  childGiggle();
}

/* -------------------- Background arcade music -------------------- */
// A simple, cheerful 8-step arpeggio over a I-V-vi-IV in C major.
// We schedule one bar at a time and re-schedule with setInterval to loop.

type MusicHandle = {
  stop: () => void;
};

let musicHandle: MusicHandle | null = null;

const SCALE_C_MAJOR = [261.63, 329.63, 392.0, 523.25]; // C E G C'

function scheduleBar(ctx: AudioContext, startAt: number, bar: number) {
  // Chord roots cycling I-V-vi-IV
  const roots = [261.63, 392.0, 440.0, 349.23];
  const root = roots[bar % roots.length];
  const stepMs = 180;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.08;
  masterGain.connect(ctx.destination);

  // Bass pulse on beats 1 & 3
  for (let beat = 0; beat < 2; beat++) {
    const t = startAt + (beat * 4 * stepMs) / 1000;
    const bass = ctx.createOscillator();
    const bg = ctx.createGain();
    bass.type = "triangle";
    bass.frequency.value = root / 2;
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    bass.connect(bg).connect(masterGain);
    bass.start(t);
    bass.stop(t + 0.4);
  }

  // 8-step arpeggio over the bar
  for (let step = 0; step < 8; step++) {
    const t = startAt + (step * stepMs) / 1000;
    const noteIdx = [0, 1, 2, 3, 2, 1, 2, 3][step];
    const ratio = SCALE_C_MAJOR[noteIdx] / SCALE_C_MAJOR[0];
    const freq = root * ratio;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

export function startMusic() {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled() || !isMusicEnabled()) return;
  if (musicHandle) return;
  const ctx = getCtx();
  if (!ctx) return;

  let bar = 0;
  const barLengthSec = (8 * 180) / 1000; // 1.44s per bar
  let nextStart = ctx.currentTime + 0.05;

  // Pre-schedule a couple of bars
  scheduleBar(ctx, nextStart, bar++);
  scheduleBar(ctx, nextStart + barLengthSec, bar++);
  nextStart += barLengthSec * 2;

  const interval = window.setInterval(() => {
    const ctxNow = getCtx();
    if (!ctxNow) {
      stopMusic();
      return;
    }
    if (nextStart < ctxNow.currentTime + 0.5) {
      nextStart = ctxNow.currentTime + 0.1;
    }
    scheduleBar(ctxNow, nextStart, bar++);
    nextStart += barLengthSec;
  }, Math.floor(barLengthSec * 1000));

  musicHandle = {
    stop: () => window.clearInterval(interval),
  };
}

export function stopMusic() {
  if (musicHandle) {
    musicHandle.stop();
    musicHandle = null;
  }
}
