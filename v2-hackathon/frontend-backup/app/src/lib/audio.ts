/**
 * Ambient space drone — 18 sine oscillators (6 base × 3 detunings),
 * low-pass filter, slow LFO modulation. Designed for immersive cosmic feel.
 * Must be initialized on a user gesture (iOS requirement).
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lfo: OscillatorNode | null = null;
let lfoGain: GainNode | null = null;
let isPlaying = false;
let oscillators: OscillatorNode[] = [];

// 6 base frequencies tuned to a spacy, ethereal chord (D minor 9 spread voicing)
const BASE_FREQS = [55, 82.41, 110, 146.83, 220, 329.63];
// 3 detunings per base: center, slightly sharp, slightly flat
const DETUNE_CENTS = [0, 7, -7];

/**
 * Initialize the audio context on first user gesture.
 * Returns true if newly initialized, false if already running.
 */
export function initAudio(): boolean {
  if (ctx) return false;

  ctx = new AudioContext();

  // Master gain — starts at 0, fades up when toggled on
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;

  // Low-pass filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  filter.Q.value = 0.7;

  // LFO for gentle volume breathing
  lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.08; // ~12s cycle
  lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.03; // subtle modulation

  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfo.start();

  // Create 18 oscillators
  for (const freq of BASE_FREQS) {
    for (const detune of DETUNE_CENTS) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = detune;

      // Individual gain — lower for higher freqs
      const g = ctx.createGain();
      g.gain.value = freq < 120 ? 0.08 : freq < 200 ? 0.05 : 0.025;

      osc.connect(g);
      g.connect(filter);
      osc.start();
      oscillators.push(osc);
    }
  }

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  return true;
}

/**
 * Toggle audio on/off. Fades gain 0↔0.15 over 0.5s.
 * Returns new playing state.
 */
export function toggleAudio(): boolean {
  if (!ctx || !masterGain) {
    initAudio();
    if (!ctx || !masterGain) return false;
  }

  // Resume suspended context (iOS)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const now = ctx.currentTime;
  if (isPlaying) {
    // Fade out
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
    isPlaying = false;
  } else {
    // Fade in
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0.15, now + 0.5);
    isPlaying = true;
  }

  return isPlaying;
}

/** Get current playing state */
export function isAudioPlaying(): boolean {
  return isPlaying;
}

/** Clean up all audio resources */
export function disposeAudio(): void {
  oscillators.forEach((o) => { try { o.stop(); } catch { /* already stopped */ } });
  oscillators = [];
  if (lfo) { try { lfo.stop(); } catch { /* already stopped */ } }
  if (ctx) { ctx.close(); }
  ctx = null;
  masterGain = null;
  lfo = null;
  lfoGain = null;
  isPlaying = false;
}
