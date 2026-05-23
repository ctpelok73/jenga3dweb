// ─── Sound Engine: Web Audio API — lightweight, no dependencies ───
// Generates all sounds procedurally (no audio files needed)
// Supports volume control from settings

import { getSettings } from './settingsTracker';

let audioCtx = null;
let masterGainNode = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioCtx.createGain();
    masterGainNode.connect(audioCtx.destination);
    updateMasterVolume();
  }
  return audioCtx;
}

function getMasterGain() {
  getCtx(); // ensure initialized
  return masterGainNode;
}

// ─── Volume control ───
// Settings store volume as 0-100, we convert to 0-1 gain
export function updateMasterVolume() {
  const settings = getSettings();
  const volume = settings.volume / 100;
  if (masterGainNode) {
    masterGainNode.gain.setValueAtTime(volume, audioCtx?.currentTime || 0);
  }
}

export function getVolumeLevel() {
  return getSettings().volume;
}

// Resume context on user interaction (browser policy)
export function resumeAudio() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  updateMasterVolume();
}

function playTone(freq, duration, type = 'sine', volume = 0.15, decay = true) {
  const ctx = getCtx();
  const master = getMasterGain();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  if (decay && volume > 0) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, volume = 0.1) {
  const ctx = getCtx();
  const master = getMasterGain();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  if (volume > 0) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master); // route through master volume
  source.start(ctx.currentTime);
}

// ─── Game sounds ───

export function playSelect() {
  // Short click — block selected
  playTone(880, 0.08, 'square', 0.12);
}

export function playPull() {
  // Sliding wood sound — block pulled out
  playNoise(0.3, 0.15);
  playTone(220, 0.2, 'sawtooth', 0.06);
}

export function playPlace() {
  // Thud — block placed on top
  playTone(150, 0.15, 'triangle', 0.2);
  playNoise(0.1, 0.08);
}

export function playCollapse() {
  // Crash — tower falls
  playNoise(0.8, 0.25);
  playTone(80, 0.5, 'sawtooth', 0.15);
  setTimeout(() => playNoise(0.4, 0.15), 200);
  setTimeout(() => playTone(60, 0.3, 'sawtooth', 0.1), 400);
}

export function playStabilize() {
  // Soft confirmation — tower settled
  playTone(660, 0.12, 'sine', 0.08);
  setTimeout(() => playTone(880, 0.1, 'sine', 0.06), 100);
}

export function playGameOver() {
  // Dramatic descending tone
  const ctx = getCtx();
  const master = getMasterGain();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 1.0);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(master); // route through master volume
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.2);
}

// ─── New sounds ───

export function playAchievementUnlock() {
  // Triumphant ascending arpeggio
  playTone(523, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.10), 120);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.08), 240);
  setTimeout(() => playTone(1047, 0.2, 'sine', 0.12), 360);
}

export function playTimerWarning() {
  // Urgent beep — timer running low
  playTone(660, 0.1, 'square', 0.10);
  setTimeout(() => playTone(660, 0.1, 'square', 0.10), 150);
  setTimeout(() => playTone(880, 0.15, 'square', 0.12), 300);
}

export function playTimerExpired() {
  // Time's up — descending buzz
  playTone(440, 0.2, 'square', 0.15);
  setTimeout(() => playTone(330, 0.2, 'square', 0.12), 200);
  setTimeout(() => playTone(220, 0.3, 'square', 0.10), 400);
}

export function playCombo() {
  // Combo streak sound — escalating pitch
  playTone(440, 0.1, 'sine', 0.08);
  setTimeout(() => playTone(550, 0.1, 'sine', 0.08), 80);
  setTimeout(() => playTone(660, 0.12, 'sine', 0.10), 160);
}

export function playShake() {
  // Low rumble for camera shake effect
  playTone(60, 0.4, 'sawtooth', 0.10);
  playNoise(0.3, 0.08);
}