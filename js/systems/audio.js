/**
 * audio.js — Procedural audio synthesis for all game sound effects.
 * Uses Web Audio API with filtering, reverb, compression, and exponential
 * envelopes for a modern, polished sound. Zero external audio files.
 */
import { game } from '../core/state.js';

let audioCtx = null;
let masterGain = null;
let compressor = null;
let volume = 0.7;
let muted = false;
let initialized = false;
let noiseBuffer = null;

// Per-sound cooldown to prevent harsh stacking
const cooldowns = {};
const MIN_INTERVAL = 35; // ms

// ---- Lifecycle ----

export function initAudio() {
  if (initialized) return;
  initialized = true;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Dynamics compressor — prevents clipping, smooths out spikes
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    compressor.connect(audioCtx.destination);

    masterGain = audioCtx.createGain();

    // Dry path
    const dryGain = audioCtx.createGain();
    dryGain.gain.value = 0.82;
    masterGain.connect(dryGain);
    dryGain.connect(compressor);

    // Wet path — multi-tap delay reverb for spatial depth
    const reverbSend = audioCtx.createGain();
    reverbSend.gain.value = 0.2;
    masterGain.connect(reverbSend);

    const reverbLP = audioCtx.createBiquadFilter();
    reverbLP.type = 'lowpass';
    reverbLP.frequency.value = 2800;
    reverbSend.connect(reverbLP);

    const tap1 = audioCtx.createDelay(0.5);
    tap1.delayTime.value = 0.09;
    const tap1G = audioCtx.createGain();
    tap1G.gain.value = 0.35;
    reverbLP.connect(tap1);
    tap1.connect(tap1G);
    tap1G.connect(compressor);

    const tap2 = audioCtx.createDelay(0.5);
    tap2.delayTime.value = 0.2;
    const tap2G = audioCtx.createGain();
    tap2G.gain.value = 0.2;
    reverbLP.connect(tap2);
    tap2.connect(tap2G);
    tap2G.connect(compressor);

    const tap3 = audioCtx.createDelay(0.5);
    tap3.delayTime.value = 0.34;
    const tap3G = audioCtx.createGain();
    tap3G.gain.value = 0.1;
    const tap3LP = audioCtx.createBiquadFilter();
    tap3LP.type = 'lowpass';
    tap3LP.frequency.value = 1800;
    reverbLP.connect(tap3);
    tap3.connect(tap3LP);
    tap3LP.connect(tap3G);
    tap3G.connect(compressor);

    // Load saved prefs
    const saved = localStorage.getItem('bounceLaser_audio');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        volume = prefs.volume ?? 0.7;
        muted = prefs.muted ?? false;
      } catch (e) { /* ignore */ }
    }
    masterGain.gain.value = muted ? 0 : volume;
  } catch (e) {
    audioCtx = null;
  }
}

export function playSound(name, opts) {
  if (!audioCtx || game.editorActive) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  // Cooldown to prevent harsh stacking
  const now = performance.now();
  if (cooldowns[name] && now - cooldowns[name] < MIN_INTERVAL) return;
  cooldowns[name] = now;
  const recipe = SOUNDS[name];
  if (recipe) recipe(opts || {});
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (masterGain && !muted) masterGain.gain.value = volume;
  savePrefs();
}
export function getVolume() { return volume; }

export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : volume;
  savePrefs();
  return muted;
}
export function isMuted() { return muted; }

function savePrefs() {
  try { localStorage.setItem('bounceLaser_audio', JSON.stringify({ volume, muted })); } catch (e) { /* */ }
}

// ---- Audio Primitives ----

function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = audioCtx.sampleRate;
  noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

function ct() { return audioCtx.currentTime; }

/**
 * Core synth voice: oscillator → lowpass filter → gain envelope → master.
 * Uses exponential decay for natural sound. Cutoff prevents harshness.
 */
function voice(type, freq0, freq1, dur, gain, cutoff, delay) {
  const s = ct() + (delay || 0);
  const o = audioCtx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq0, s);
  if (freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(Math.max(freq1, 20), s + dur);

  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cutoff || 2500;
  lp.Q.value = 0.7;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, s);
  g.gain.exponentialRampToValueAtTime(0.001, s + dur);

  o.connect(lp);
  lp.connect(g);
  g.connect(masterGain);
  o.start(s);
  o.stop(s + dur + 0.02);
}

/**
 * Filtered noise burst with exponential decay.
 */
function noiseBurst(filterType, freq, Q, dur, gain, delay) {
  const s = ct() + (delay || 0);
  const src = audioCtx.createBufferSource();
  src.buffer = getNoiseBuffer();

  const f = audioCtx.createBiquadFilter();
  f.type = filterType;
  f.frequency.value = freq;
  f.Q.value = Q;

  // Extra lowpass to tame harshness
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(freq * 1.5, 5500);
  lp.Q.value = 0.5;

  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, s);
  g.gain.exponentialRampToValueAtTime(0.001, s + dur);

  src.connect(f);
  f.connect(lp);
  lp.connect(g);
  g.connect(masterGain);
  src.start(s);
  src.stop(s + dur + 0.02);
}

/** Soft sine tone — gentlest building block */
function tone(freq, dur, gain, delay) {
  voice('sine', freq, freq, dur, gain, 3000, delay);
}

// ---- Sound Recipes ----

const SOUNDS = {

  // ── Player Actions ──

  shoot(opts) {
    const p = opts.pitch || 1;
    // Filtered sine sweep — warm, not harsh
    voice('sine', 660 * p, 180 * p, 0.1, 0.18, 2000, 0);
    // Soft noise transient for texture
    noiseBurst('bandpass', 1800, 1.5, 0.06, 0.07, 0);
    // Subtle click attack
    voice('triangle', 1100 * p, 550 * p, 0.03, 0.06, 2500, 0);
  },

  bounce(opts) {
    const p = opts.pitch || 1;
    // Soft glass-like ping
    tone(880 * p, 0.1, 0.1, 0);
    tone(1320 * p, 0.07, 0.05, 0.01);
  },

  shield_on() {
    // Gentle rising shimmer with beating
    voice('sine', 250, 600, 0.2, 0.1, 2000, 0);
    voice('sine', 255, 606, 0.2, 0.08, 2000, 0);
    noiseBurst('bandpass', 1200, 0.8, 0.15, 0.025, 0.05);
  },

  shield_off() {
    voice('sine', 600, 200, 0.15, 0.08, 1800, 0);
    voice('sine', 606, 204, 0.15, 0.06, 1800, 0);
  },

  shield_reflect() {
    // Bright but filtered ping + soft sub
    voice('triangle', 700, 1200, 0.06, 0.12, 3000, 0);
    tone(350, 0.08, 0.06, 0);
    noiseBurst('bandpass', 2000, 1, 0.04, 0.03, 0);
  },

  // ── Combat ──

  enemy_hit(opts) {
    const p = opts.pitch || 1;
    // Soft thud
    voice('sine', 160 * p, 60 * p, 0.1, 0.15, 1200, 0);
    noiseBurst('lowpass', 800, 0.8, 0.05, 0.06, 0);
  },

  enemy_death() {
    // Layered low sweep + filtered texture
    voice('sine', 300, 50, 0.25, 0.16, 1500, 0);
    voice('triangle', 500, 120, 0.18, 0.08, 2000, 0);
    noiseBurst('bandpass', 1200, 0.8, 0.18, 0.08, 0);
    noiseBurst('lowpass', 600, 0.5, 0.12, 0.04, 0.05);
  },

  enemy_shoot(opts) {
    const p = opts.pitch || 1;
    // Soft pew — quieter than player shoot
    voice('triangle', 440 * p, 200 * p, 0.07, 0.06, 1800, 0);
    noiseBurst('bandpass', 1500, 1, 0.04, 0.025, 0);
  },

  barrel_explode() {
    // Deep rumble — all low frequency, well filtered
    voice('sine', 65, 25, 0.4, 0.22, 800, 0);
    voice('sine', 45, 20, 0.55, 0.15, 500, 0);
    noiseBurst('lowpass', 600, 0.6, 0.35, 0.15, 0);
    noiseBurst('bandpass', 1200, 0.5, 0.2, 0.06, 0.02);
    noiseBurst('bandpass', 2200, 1.5, 0.12, 0.03, 0.08);
  },

  chain_lightning() {
    // FM synthesis with lowpass — buzzy but not harsh
    const s = ct();
    const mod = audioCtx.createOscillator();
    const modG = audioCtx.createGain();
    mod.frequency.value = 35;
    modG.gain.value = 400;
    mod.connect(modG);

    const carrier = audioCtx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.value = 1200;
    modG.connect(carrier.frequency);

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2500;
    lp.Q.value = 0.7;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.1, s);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.15);

    carrier.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    mod.start(s);
    carrier.start(s);
    mod.stop(s + 0.16);
    carrier.stop(s + 0.16);

    noiseBurst('bandpass', 2800, 2, 0.08, 0.03, 0);
  },

  bullet_explode() {
    // Smaller version of barrel
    voice('sine', 80, 30, 0.2, 0.12, 800, 0);
    voice('sine', 55, 22, 0.3, 0.08, 500, 0);
    noiseBurst('lowpass', 700, 0.6, 0.2, 0.08, 0);
    noiseBurst('bandpass', 1500, 1, 0.1, 0.03, 0.02);
  },

  prism_destroy() {
    // Crystalline shatter — filtered triangles + sparkle
    voice('triangle', 1800, 900, 0.12, 0.08, 3500, 0);
    voice('triangle', 1400, 500, 0.15, 0.06, 3000, 0);
    noiseBurst('bandpass', 3000, 2, 0.1, 0.04, 0);
    tone(600, 0.1, 0.05, 0.02);
  },

  crit_hit() {
    // Enhanced hit — deeper thud + subtle bright layer
    voice('sine', 180, 55, 0.1, 0.18, 1200, 0);
    noiseBurst('lowpass', 900, 0.8, 0.06, 0.08, 0);
    tone(1000, 0.08, 0.06, 0);
  },

  // ── Pickups ──

  apple_pickup() {
    // Warm major arpeggio — C5 E5 G5
    tone(523, 0.18, 0.12, 0);
    tone(659, 0.18, 0.12, 0.07);
    tone(784, 0.2, 0.1, 0.14);
  },

  pickup_collect() {
    // Quick bright ascending
    voice('triangle', 700, 1100, 0.1, 0.1, 3000, 0);
    tone(550, 0.08, 0.05, 0);
  },

  portal_enter() {
    // Sci-fi warp — sine sweep with phasing, well filtered
    const s = ct();
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, s);
    o.frequency.exponentialRampToValueAtTime(600, s + 0.1);
    o.frequency.exponentialRampToValueAtTime(180, s + 0.22);

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.1, s);
    g.gain.exponentialRampToValueAtTime(0.001, s + 0.25);

    o.connect(lp);
    lp.connect(g);
    g.connect(masterGain);
    o.start(s);
    o.stop(s + 0.26);

    // Detuned pair for phasing
    const o2 = audioCtx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(190, s);
    o2.frequency.exponentialRampToValueAtTime(618, s + 0.1);
    o2.frequency.exponentialRampToValueAtTime(190, s + 0.22);
    const g2 = audioCtx.createGain();
    g2.gain.setValueAtTime(0.07, s);
    g2.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
    o2.connect(lp);
    lp.connect(g2);
    g2.connect(masterGain);
    o2.start(s);
    o2.stop(s + 0.26);
  },

  // ── Game Flow ──

  damage_taken() {
    // Firm but not harsh — filtered low tones
    voice('sine', 120, 60, 0.2, 0.18, 800, 0);
    noiseBurst('lowpass', 500, 0.6, 0.15, 0.1, 0);
    voice('triangle', 80, 40, 0.25, 0.08, 600, 0);
  },

  second_life() {
    // Dramatic rising — warm sine layers
    voice('sine', 80, 500, 0.45, 0.15, 2000, 0);
    tone(350, 0.4, 0.1, 0.1);
    tone(440, 0.35, 0.08, 0.18);
    tone(525, 0.3, 0.06, 0.25);
    noiseBurst('bandpass', 2000, 1, 0.15, 0.025, 0.2);
  },

  level_clear() {
    // Victory — ascending arpeggio into sustained chord
    tone(523, 0.2, 0.12, 0);
    tone(659, 0.2, 0.12, 0.12);
    tone(784, 0.2, 0.12, 0.24);
    // Sustained chord
    tone(523, 0.5, 0.08, 0.36);
    tone(659, 0.5, 0.08, 0.36);
    tone(784, 0.5, 0.08, 0.36);
    tone(1046, 0.4, 0.03, 0.36);
  },

  game_over() {
    // Somber descending — warm tones
    voice('sine', 350, 170, 0.6, 0.12, 1500, 0);
    voice('sine', 420, 200, 0.6, 0.1, 1500, 0);
    voice('sine', 70, 35, 0.7, 0.08, 500, 0);
  },

  upgrade_select() {
    // Quick positive confirmation
    tone(500, 0.1, 0.1, 0);
    tone(700, 0.12, 0.08, 0.05);
  },

  ui_click() {
    // Minimal soft tick — sine, not square
    tone(600, 0.04, 0.05, 0);
  },

  // ── Combo System ──

  combo_hit(opts) {
    const combo = opts.combo || 2;
    const p = 1 + (combo - 2) * 0.1;
    tone(600 * p, 0.06, 0.1, 0);
    voice('triangle', 1100 * p, 1100 * p, 0.04, 0.06, 3000, 0.02);
  },

  combo_milestone() {
    tone(523, 0.12, 0.12, 0);
    tone(784, 0.12, 0.1, 0.04);
    voice('triangle', 1046, 1046, 0.1, 0.06, 3500, 0.06);
  },

  combo_super() {
    voice('sine', 200, 700, 0.2, 0.15, 2000, 0);
    tone(523, 0.2, 0.1, 0.12);
    tone(659, 0.2, 0.1, 0.12);
    tone(784, 0.2, 0.1, 0.12);
    noiseBurst('bandpass', 2500, 1, 0.1, 0.03, 0.08);
  },

  combo_break() {
    voice('sine', 350, 170, 0.15, 0.08, 1500, 0);
    voice('sine', 260, 130, 0.15, 0.05, 1200, 0);
  },

  // ── Boss ──

  boss_phase() {
    // Dramatic rising crescendo
    voice('sine', 100, 800, 0.6, 0.2, 2000, 0);
    voice('sine', 150, 900, 0.5, 0.15, 2500, 0.1);
    voice('triangle', 200, 1200, 0.4, 0.1, 3000, 0.2);
    noiseBurst('bandpass', 3000, 1, 0.3, 0.08, 0);
  },

  boss_shoot(opts) {
    const p = (opts && opts.pitch) || 1;
    voice('sawtooth', 300 * p, 150 * p, 0.12, 0.1, 1800, 0);
    voice('sine', 600 * p, 300 * p, 0.08, 0.06, 2000, 0);
    noiseBurst('bandpass', 2000, 2, 0.06, 0.04, 0);
  },

  boss_beam_charge() {
    // Ominous rising beating tones
    voice('sine', 60, 400, 2.0, 0.08, 1500, 0);
    voice('sine', 63, 403, 2.0, 0.06, 1500, 0);
    noiseBurst('bandpass', 200, 2, 2.0, 0.03, 0);
  },

  boss_beam_fire() {
    // Massive sustained blast
    voice('sawtooth', 80, 40, 0.8, 0.2, 800, 0);
    noiseBurst('lowpass', 600, 1, 0.8, 0.18, 0);
    voice('sine', 60, 60, 0.6, 0.1, 500, 0);
  },

  boss_death() {
    // Multi-layered explosion sequence + victory sting
    voice('sine', 200, 30, 1.0, 0.18, 800, 0);
    noiseBurst('lowpass', 800, 1, 0.8, 0.15, 0);
    voice('sine', 400, 100, 0.6, 0.12, 1200, 0.3);
    voice('sine', 600, 200, 0.4, 0.08, 1500, 0.6);
    noiseBurst('bandpass', 2000, 1, 0.4, 0.06, 0.8);
    // Victory chord
    tone(523, 0.3, 0.1, 1.5);
    tone(659, 0.3, 0.1, 1.7);
    tone(784, 0.5, 0.12, 1.9);
  },

  boss_stun() {
    // Descending wobble
    voice('sine', 600, 200, 0.3, 0.12, 2000, 0);
    voice('sine', 500, 150, 0.3, 0.1, 1800, 0.05);
  },

  boss_clone() {
    // Ethereal shimmer
    voice('sine', 800, 400, 0.3, 0.08, 3000, 0);
    voice('sine', 812, 412, 0.3, 0.06, 3000, 0);
    voice('triangle', 1200, 600, 0.2, 0.05, 3500, 0);
  },
};
