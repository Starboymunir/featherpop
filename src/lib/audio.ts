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
let pointerUnlockBound = false;

function bindGlobalUnlock() {
  if (pointerUnlockBound) return;
  if (typeof window === "undefined") return;
  pointerUnlockBound = true;
  const resume = () => {
    if (audioCtx && audioCtx.state !== "running") {
      audioCtx.resume().catch(() => {});
    }
  };
  // Any tap, click, or key press is a valid user gesture for resume.
  // Passive listeners so we don't fight scrolling.
  window.addEventListener("pointerdown", resume, { passive: true });
  window.addEventListener("touchstart", resume, { passive: true });
  window.addEventListener("keydown", resume, { passive: true });
}

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
  // Try to resume — works inside a user-gesture call stack, no-op otherwise.
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  // Set up the global unlock listeners exactly once.
  bindGlobalUnlock();
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

/**
 * Sparkly "correct word!" jingle — a quick bright arpeggio with a shimmer on
 * top. Used in Letter Pop each time a valid word is accepted. `step` shifts
 * the whole thing up a little for longer words so combos feel like they climb.
 */
export function jingle(step = 0) {
  const base = 1 + Math.min(step, 6) * 0.045; // subtle upward drift
  const notes = [784, 988, 1319, 1568]; // G5 B5 E6 G6 — a bright major sparkle
  notes.forEach((f, i) => {
    tone(f * base, 150, "triangle", 0.2, i * 0.06);
  });
  // Shimmer tail (bell-like sine) an octave up.
  tone(1976 * base, 260, "sine", 0.12, 0.24);
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

/* -------------------- Filtered-noise helpers -------------------- */

/**
 * A short burst of bandpass-filtered noise — used as the "body" of wind,
 * whoosh and impact sounds. The filter sweep gives motion.
 */
function noiseBurst(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  q: number = 4,
  startGain: number = 0.18,
  delay: number = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const dur = durationMs / 1000;
  // Buffer of white noise — generated once per call (small).
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(sr * dur));
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(startFreq, t0);
  bp.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 40), t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(startGain, t0 + Math.min(0.05, dur * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(gain).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** FM-synthesized bird chirp — sounds organic, more "real bird" than a chirp. */
function birdChirp(
  carrierFreq: number,
  modIndex: number,
  durationMs: number,
  startGain: number = 0.18,
  delay: number = 0,
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const dur = durationMs / 1000;
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();
  carrier.type = "sine";
  mod.type = "sine";
  carrier.frequency.value = carrierFreq;
  mod.frequency.setValueAtTime(carrierFreq * 1.7, t0);
  mod.frequency.exponentialRampToValueAtTime(carrierFreq * 2.4, t0 + dur);
  modGain.gain.setValueAtTime(modIndex, t0);
  modGain.gain.exponentialRampToValueAtTime(modIndex * 0.3, t0 + dur);
  mod.connect(modGain).connect(carrier.frequency);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(startGain, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  carrier.connect(gain).connect(ctx.destination);
  mod.start(t0);
  carrier.start(t0);
  mod.stop(t0 + dur + 0.05);
  carrier.stop(t0 + dur + 0.05);
}

/* -------------------- Feather Sort SFX -------------------- */

/** Soft "shwip" when a feather is picked up — short, airy. */
export function featherPickup() {
  noiseBurst(2400, 4200, 110, 8, 0.12);
  chirp(900, 1500, 70, "sine", 0.08, 0.03);
}

/** Bright crystalline chime when a feather lands in the correct nest. */
export function featherDrop() {
  // Pluck attack
  tone(880, 60, "triangle", 0.18);
  // Layered chime
  chirp(660, 990, 180, "sine", 0.18, 0.02);
  chirp(990, 1320, 200, "triangle", 0.14, 0.08);
  chirp(1760, 2200, 160, "sine", 0.1, 0.18);
  // Sparkle dust tail
  [2400, 2800, 3200].forEach((f, i) => tone(f, 80, "sine", 0.06, 0.22 + i * 0.05));
}

/** Soft "wuh" for wrong-nest drop. Disappointed, not harsh. */
export function wrongDrop() {
  chirp(340, 220, 200, "triangle", 0.18);
  chirp(220, 150, 150, "sine", 0.12, 0.08);
  noiseBurst(300, 200, 120, 2, 0.06, 0.04);
}

/** Creeping descending wobble + skittering tick-tick of spider legs. */
export function spiderApproach() {
  // Descending creepy slide on a "wow-wah" filter wobble
  chirp(540, 130, 950, "triangle", 0.2);
  chirp(380, 90, 950, "sine", 0.1, 0.05);
  // Skittering: rapid filtered noise pulses
  for (let i = 0; i < 12; i++) {
    noiseBurst(2200 + Math.random() * 1200, 800, 40, 12, 0.06, 0.15 + i * 0.07);
  }
  // Low ominous swell tail
  chirp(80, 60, 600, "sawtooth", 0.05, 0.6);
}

/** Wing-flap whoosh + ascending whistle as the bird flies in. */
export function birdWhoosh() {
  // Wind body — wide-bandpass noise sweeping low→high (whoosh)
  noiseBurst(220, 1800, 800, 3, 0.2);
  // Ascending bird whistle (the FM chirp sounds organic)
  birdChirp(880, 200, 360, 0.16, 0.1);
  birdChirp(1100, 240, 320, 0.14, 0.32);
  // 3 wing-beat noise pulses underneath
  [0.05, 0.22, 0.4].forEach((d) =>
    noiseBurst(160, 60, 100, 2, 0.18, d),
  );
  // Cheerful flute swell on top
  chirp(440, 1400, 600, "triangle", 0.12, 0.15);
}

/* -------------------- Voice clips (real recordings) --------------------
 * Real recordings of Chanel saying brand lines, dropped at
 * /public/audio/voicenotes/<slug>.mp3. Each helper plays the clip and
 * fanfares behind it. If the clip 404s or the user has sound off, we
 * fall back to the synthesized speechSynthesis line so the moment still
 * lands. The clip cache reuses HTMLAudioElements so rapid replay doesn't
 * cause a fresh network fetch each time. */

/* -------------------- Voice-clip pipeline (Web Audio) --------------------
 *
 * Earlier passes used HTMLAudioElement + an unlock trick. Two problems on
 * iOS Safari that the unlock pattern can't fix:
 *
 *   (a) Each HTMLAudioElement needs its OWN user-gesture-triggered
 *       play() before it can be played later. So we had to loop through
 *       all 4 voice clips on the PLAY tap and silently play each one to
 *       unlock them. Setting volume=0 was ignored (iOS treats volume as
 *       read-only), and setting muted=true raced the play() so the
 *       brief "all clips at once" leak still happened.
 *
 *   (b) After a clip finished, replaying it from currentTime=0 was
 *       unreliable; load() helped sometimes but not always.
 *
 * Switching to Web Audio sidesteps both: the AudioContext is unlocked
 * ONCE by the pop() on PLAY tap, and every subsequent voice clip
 * decodes to an AudioBuffer and plays through a fresh BufferSource.
 * No per-element gesture, no replay weirdness, and zero unlock noise.
 */

// Cache: src → AudioBuffer (decoded once, replayed forever).
const voiceBufferCache = new Map<string, AudioBuffer>();
// Cache: src → an in-flight fetch+decode promise so concurrent callers
// don't double-fetch the same clip.
const voiceLoading = new Map<string, Promise<AudioBuffer>>();

// Track the single currently-playing voice clip so a new one can cut
// the previous off (no two voice lines on top of each other).
let activeVoice: AudioBufferSourceNode | null = null;
let activeVoiceGain: GainNode | null = null;

function stopActiveVoice(): void {
  if (!activeVoice) return;
  try {
    activeVoice.stop();
  } catch {
    /* may already have stopped */
  }
  try {
    activeVoice.disconnect();
    activeVoiceGain?.disconnect();
  } catch {
    /* ignore */
  }
  activeVoice = null;
  activeVoiceGain = null;
}

async function loadVoiceBuffer(src: string): Promise<AudioBuffer> {
  const cached = voiceBufferCache.get(src);
  if (cached) return cached;
  const inflight = voiceLoading.get(src);
  if (inflight) return inflight;

  const ctx = getCtx();
  if (!ctx) throw new Error("AudioContext unavailable");

  const p = (async () => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`fetch ${src} → ${res.status}`);
    const ab = await res.arrayBuffer();
    // decodeAudioData has both Promise + callback signatures; the
    // Promise form is supported on every browser we target.
    const buf = await ctx.decodeAudioData(ab);
    voiceBufferCache.set(src, buf);
    return buf;
  })();

  voiceLoading.set(src, p);
  try {
    return await p;
  } finally {
    voiceLoading.delete(src);
  }
}

/**
 * No-op kept for backward compatibility with old callers. The new pipeline
 * doesn't need a separate unlock — the AudioContext is resumed by the
 * existing pop() / fanfare() chain on the PLAY tap, and once it's running
 * every voice clip plays through it with no per-element gesture.
 *
 * We DO pre-warm the buffers here so the first eagle line doesn't stall
 * on a network fetch mid-celebration.
 */
export function unlockVoiceClips(): void {
  if (typeof window === "undefined") return;
  for (const src of ALL_VOICE_CLIPS) {
    if (!voiceBufferCache.has(src) && !voiceLoading.has(src)) {
      // Fire-and-forget; failures are surfaced by playClip later.
      void loadVoiceBuffer(src).catch(() => {});
    }
  }
}

const ALL_VOICE_CLIPS = [
  "/audio/voicenotes/strudelay.mp3",
  "/audio/voicenotes/can-you-help-me-find-this-word-in-the-park.mp3",
  "/audio/voicenotes/yes-feathertag-up-and-lets-find-the-word.mp3",
  "/audio/voicenotes/oh-no-lets-hurry-up-before-the-spider-comes.mp3",
];

function playClip(src: string, fallback: () => void): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) {
    fallback();
    return;
  }

  // Serialize: any voice line already playing gets cut so the new one
  // isn't layered on top.
  stopActiveVoice();

  const buf = voiceBufferCache.get(src);

  const start = (b: AudioBuffer) => {
    const c = getCtx();
    if (!c) {
      fallback();
      return;
    }
    const doStart = () => {
      const src2 = c.createBufferSource();
      src2.buffer = b;
      const gain = c.createGain();
      gain.gain.value = 1;
      src2.connect(gain).connect(c.destination);
      activeVoice = src2;
      activeVoiceGain = gain;
      src2.onended = () => {
        if (activeVoice === src2) activeVoice = null;
        if (activeVoiceGain === gain) activeVoiceGain = null;
      };
      try {
        src2.start(0);
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn(`[audio] start() failed for ${src}:`, err);
        }
        fallback();
      }
    };

    // Critical on iOS Safari: a suspended AudioContext will accept
    // src.start() without throwing, then play NOTHING. Resume first.
    // If resume rejects (no recent gesture), fall back to TTS so the
    // moment still lands.
    if (c.state !== "running") {
      c.resume()
        .then(() => doStart())
        .catch(() => fallback());
      return;
    }
    doStart();
  };

  if (buf) {
    start(buf);
    return;
  }

  // First-time call for this clip — fetch + decode, then play. The
  // celebration timing usually gives us a 200–700ms head start before
  // the voice line is needed, which is plenty for a 70–150KB MP3.
  void loadVoiceBuffer(src)
    .then(start)
    .catch((err) => {
      if (typeof console !== "undefined") {
        console.warn(`[audio] loadVoiceBuffer(${src}) failed:`, err?.message ?? err);
      }
      fallback();
    });
}

/** Public: stop the currently-playing voice clip (used by Wordshake on cancel). */
export function stopVoice(): void {
  stopActiveVoice();
}

function speakFallback(message: string, pitch = 1, rate = 1): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(message);
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const v =
      voices.find((x) => /male|david|mark/i.test(x.name)) ??
      voices.find((x) => x.lang?.startsWith("en"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/** Strudelay! Strudelay! — Chanel's recorded eagle call. */
export function eagleVoice() {
  playClip(
    "/audio/voicenotes/strudelay.mp3",
    () => speakFallback("Strudelay! Strudelay!", 0.7),
  );
  // Triumphant fanfare under the call.
  chirp(660, 880, 220, "triangle", 0.18, 0.05);
  chirp(880, 1320, 260, "sine", 0.16, 0.18);
}

/** Eagle hands the child their target word — Park Hunt intro. */
export function eagleHandsWord() {
  playClip(
    "/audio/voicenotes/can-you-help-me-find-this-word-in-the-park.mp3",
    () => speakFallback("Can you help me find this word in the park?", 0.8),
  );
}

/** Child found the word — Park Hunt celebration. */
export function eagleCheers() {
  playClip(
    "/audio/voicenotes/yes-feathertag-up-and-lets-find-the-word.mp3",
    () => speakFallback("Yes! Feathers up and let's find the word!", 0.8),
  );
}

/** Spider arrives — used in Feather Match loss + Park Hunt low-timer. */
export function spiderVoice() {
  playClip(
    "/audio/voicenotes/oh-no-lets-hurry-up-before-the-spider-comes.mp3",
    () => speakFallback("Oh no, let's hurry up before the spider comes!", 0.95, 0.95),
  );
}

/**
 * Cracking sound for the egg-progress milestones. Two sharp,
 * brittle "tk-tk" hits followed by a soft sparkle tail so it
 * lands as "something is opening" rather than "something broke."
 */
export function eggCrack() {
  // Tk
  tone(2200, 50, "square", 0.18);
  tone(1700, 70, "square", 0.14, 0.06);
  // Tk-tk
  tone(2400, 50, "square", 0.18, 0.18);
  tone(1900, 80, "square", 0.14, 0.24);
  // Magic glimmer tail
  chirp(2400, 3600, 200, "sine", 0.1, 0.35);
  tone(2640, 120, "triangle", 0.12, 0.45);
}

/** Magical sparkle cascade when the parchment word reveals. */
export function wordReveal() {
  // Pixie chord — Cmaj9 (C E G B D) arpeggio with triangle bell timbre
  const notes = [523, 659, 784, 988, 1175];
  notes.forEach((n, i) => {
    tone(n, 380, "triangle", 0.18, i * 0.08);
    tone(n * 2, 380, "sine", 0.08, i * 0.08); // octave shimmer
  });
  // Cascading sparkle dust — high tones tumbling down
  const dust = [3200, 2800, 2400, 2000, 1760, 1480];
  dust.forEach((f, i) => tone(f, 90, "sine", 0.07, 0.45 + i * 0.05));
  // Magic "ting" at the climax
  tone(2640, 160, "triangle", 0.18, 0.55);
  tone(3960, 220, "sine", 0.1, 0.55);
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

/**
 * One-shot teardown of every audio source we own. Wired to route changes
 * (see AudioNavCleanup) so navigating away from a game kills the music,
 * any in-flight voice clip, and any speechSynthesis utterance instead of
 * letting them carry over into the next page.
 */
export function stopAllAudio() {
  stopMusic();
  stopVoice();
  stopSpeaking();
}
