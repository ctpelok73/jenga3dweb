// ─── Sound Engine: Web Audio API — lightweight, no dependencies ───
// Generates all sounds procedurally (no audio files needed)
// Supports volume control from settings

import { getSettings } from './settingsTracker';

let audioCtx = null;
let masterGainNode = null;
let _noiseBuffer = null;
const _pendingTimers = [];

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

function getNoiseBuffer(duration) {
  const ctx = getCtx();
  const neededSamples = Math.ceil(ctx.sampleRate * duration);
  if (!_noiseBuffer || _noiseBuffer.length < neededSamples) {
    const size = Math.max(neededSamples, ctx.sampleRate); // at least 1 second
    _noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = _noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
  }
  return _noiseBuffer;
}

function _scheduleTimer(fn, delay) {
  const id = setTimeout(() => {
    const idx = _pendingTimers.indexOf(id);
    if (idx !== -1) _pendingTimers.splice(idx, 1);
    fn();
  }, delay);
  _pendingTimers.push(id);
  return id;
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
  const buffer = getNoiseBuffer(duration);
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
  gain.connect(master);
  source.start(ctx.currentTime, 0, duration);
}

/** @private — reset internal state for testing */
export function _resetInternalState() {
  audioCtx = null;
  masterGainNode = null;
  _noiseBuffer = null;
  for (const id of _pendingTimers) clearTimeout(id);
  _pendingTimers.length = 0;
}

export function cancelPendingSounds() {
  for (const id of _pendingTimers) clearTimeout(id);
  _pendingTimers.length = 0;
}

// ─── Game sounds ───

export function playSelect() {
  playTone(880, 0.08, 'square', 0.12);
}

export function playPull() {
  playNoise(0.3, 0.15);
  playTone(220, 0.2, 'sawtooth', 0.06);
}

export function playPlace() {
  playTone(150, 0.15, 'triangle', 0.2);
  playNoise(0.1, 0.08);
}

export function playCollapse() {
  playNoise(0.8, 0.25);
  playTone(80, 0.5, 'sawtooth', 0.15);
  _scheduleTimer(() => playNoise(0.4, 0.15), 200);
  _scheduleTimer(() => playTone(60, 0.3, 'sawtooth', 0.1), 400);
}

export function playStabilize() {
  playTone(660, 0.12, 'sine', 0.08);
  _scheduleTimer(() => playTone(880, 0.1, 'sine', 0.06), 100);
}

export function playGameOver() {
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
  gain.connect(master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.2);
}

export function playAchievementUnlock() {
  playTone(523, 0.15, 'sine', 0.12);
  _scheduleTimer(() => playTone(659, 0.15, 'sine', 0.10), 120);
  _scheduleTimer(() => playTone(784, 0.15, 'sine', 0.08), 240);
  _scheduleTimer(() => playTone(1047, 0.2, 'sine', 0.12), 360);
}
