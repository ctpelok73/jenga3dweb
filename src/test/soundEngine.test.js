import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock settingsTracker ──────────────────────────────────────────────────

vi.mock('../settingsTracker', () => ({
  getSettings: vi.fn(() => ({ volume: 70 })),
}));

import * as soundEngine from '../soundEngine';
import { getSettings } from '../settingsTracker';

// ─── Mock Web Audio API helpers ────────────────────────────────────────────

function createMockOscillator() {
  return {
    type: 'sine',
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGain() {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
}

function createMockFilter() {
  return {
    type: 'lowpass',
    frequency: { value: 800 },
    connect: vi.fn(),
  };
}

function createMockBufferSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockAudioBuffer() {
  const length = 44100;
  return {
    length,
    sampleRate: 44100,
    getChannelData: vi.fn(() => new Float32Array(length)),
    numberOfChannels: 1,
  };
}

let mockCtx;

beforeEach(() => {
  // Reset the module's internal state so each test gets a fresh AudioContext
  soundEngine._resetInternalState();

  mockCtx = {
    currentTime: 0,
    sampleRate: 44100,
    state: 'running',
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(createMockOscillator),
    createGain: vi.fn(createMockGain),
    createBiquadFilter: vi.fn(createMockFilter),
    createBufferSource: vi.fn(createMockBufferSource),
    createBuffer: vi.fn(createMockAudioBuffer),
  };

  window.AudioContext = vi.fn(function() { return mockCtx; });
  window.webkitAudioContext = undefined;

  vi.useFakeTimers();
  getSettings.mockReturnValue({ volume: 70 });
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLastOscillator() {
  const calls = mockCtx.createOscillator.mock.results;
  return calls[calls.length - 1]?.value ?? null;
}

function getOscillator(index) {
  return mockCtx.createOscillator.mock.results[index]?.value ?? null;
}

function getLastGain() {
  const calls = mockCtx.createGain.mock.results;
  // Skip gain[0]=masterGainNode, return the last non-master gain
  return calls.length > 1 ? calls[calls.length - 1].value : null;
}

function getGain(index) {
  return mockCtx.createGain.mock.results[index]?.value ?? null;
}

function oscillatorCount() {
  return mockCtx.createOscillator.mock.calls.length;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('soundEngine', () => {
  // ─── Lazy initialization ────────────────────────────────────────────

  describe('lazy initialization', () => {
    it('does not create AudioContext before any play function', () => {
      expect(window.AudioContext).not.toHaveBeenCalled();
    });

    it('creates AudioContext on first play function call', () => {
      soundEngine.playSelect();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('creates master gain node and connects to destination', () => {
      soundEngine.playSelect();
      const masterGain = getGain(0);
      expect(masterGain).not.toBeNull();
      expect(masterGain.connect).toHaveBeenCalledWith(mockCtx.destination);
    });

    it('reuses cached AudioContext on subsequent calls', () => {
      soundEngine.playSelect();
      soundEngine.playPull();
      soundEngine.playPlace();

      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateMasterVolume ─────────────────────────────────────────────

  describe('updateMasterVolume', () => {
    it('sets master gain volume from settings after init', () => {
      getSettings.mockReturnValue({ volume: 50 });
      soundEngine.resumeAudio();

      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0);
    });

    it('applies volume=0 correctly', () => {
      getSettings.mockReturnValue({ volume: 0 });
      soundEngine.resumeAudio();

      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    });

    it('applies volume=100 correctly (full gain)', () => {
      getSettings.mockReturnValue({ volume: 100 });
      soundEngine.resumeAudio();

      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(1, 0);
    });

    it('updates master gain when called after settings change', () => {
      soundEngine.resumeAudio();

      getSettings.mockReturnValue({ volume: 30 });
      soundEngine.updateMasterVolume();

      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.7, 0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.3, 0);
    });

    it('does nothing when masterGainNode is not yet created', () => {
      expect(() => soundEngine.updateMasterVolume()).not.toThrow();
    });
  });

  // ─── getVolumeLevel ─────────────────────────────────────────────────

  describe('getVolumeLevel', () => {
    it('returns current volume from settings', () => {
      getSettings.mockReturnValue({ volume: 42 });
      expect(soundEngine.getVolumeLevel()).toBe(42);
    });

    it('returns 70 by default', () => {
      expect(soundEngine.getVolumeLevel()).toBe(70);
    });
  });

  // ─── resumeAudio ────────────────────────────────────────────────────

  describe('resumeAudio', () => {
    it('initializes AudioContext', () => {
      expect(window.AudioContext).not.toHaveBeenCalled();
      soundEngine.resumeAudio();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('calls ctx.resume() when context is suspended', () => {
      mockCtx.state = 'suspended';
      soundEngine.resumeAudio();
      expect(mockCtx.resume).toHaveBeenCalledTimes(1);
    });

    it('does not call ctx.resume() when context is already running', () => {
      soundEngine.resumeAudio();
      expect(mockCtx.resume).not.toHaveBeenCalled();
    });

    it('updates master volume after resume', () => {
      soundEngine.resumeAudio();
      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.7, 0);
    });
  });

  // ─── cancelPendingSounds ────────────────────────────────────────────

  describe('cancelPendingSounds', () => {
    it('stops scheduled sounds from executing', () => {
      soundEngine.playCollapse(); // schedules 2 timers
      soundEngine.playAchievementUnlock(); // schedules 4 timers

      soundEngine.cancelPendingSounds();

      const before = oscillatorCount();
      vi.advanceTimersByTime(5000);
      expect(oscillatorCount()).toBe(before);
    });

    it('is safe to call multiple times', () => {
      soundEngine.cancelPendingSounds();
      soundEngine.cancelPendingSounds();
      soundEngine.cancelPendingSounds();
    });

    it('is safe when no sounds were played', () => {
      expect(() => soundEngine.cancelPendingSounds()).not.toThrow();
    });
  });

  // ─── playSelect ─────────────────────────────────────────────────────

  describe('playSelect', () => {
    it('creates an oscillator with square wave at 880Hz', () => {
      soundEngine.playSelect();

      const osc = getLastOscillator();
      expect(osc).not.toBeNull();
      expect(osc.type).toBe('square');
      expect(osc.frequency.value).toBe(880);
    });

    it('starts and stops with correct timing', () => {
      soundEngine.playSelect();

      const osc = getLastOscillator();
      expect(osc.start).toHaveBeenCalledWith(0);
      expect(osc.stop).toHaveBeenCalledWith(0.08);
    });

    it('connects oscillator through gain chain to master', () => {
      soundEngine.playSelect();

      const osc = getLastOscillator();
      const gain = getLastGain();

      expect(osc.connect).toHaveBeenCalledWith(gain);
      expect(gain.connect).toHaveBeenCalledWith(getGain(0));
    });
  });

  // ─── playPull ───────────────────────────────────────────────────────

  describe('playPull', () => {
    it('creates noise via buffer source and lowpass filter', () => {
      soundEngine.playPull();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
      const filter = mockCtx.createBiquadFilter.mock.results[0]?.value;
      expect(filter.type).toBe('lowpass');
      expect(filter.frequency.value).toBe(800);
    });

    it('also creates a sawtooth oscillator at 220Hz', () => {
      soundEngine.playPull();

      const osc = getLastOscillator();
      expect(osc.type).toBe('sawtooth');
      expect(osc.frequency.value).toBe(220);
    });

    it('connects noise source → filter → gain, and osc → gain, both → master', () => {
      soundEngine.playPull();

      // Gains: [0]=masterGainNode, [1]=noiseGain, [2]=oscGain
      const masterGain = getGain(0);
      expect(mockCtx.createGain).toHaveBeenCalledTimes(3);
      // Both gains connect to master
      expect(getGain(1).connect).toHaveBeenCalledWith(masterGain);
      expect(getGain(2).connect).toHaveBeenCalledWith(masterGain);
    });
  });

  // ─── playPlace ──────────────────────────────────────────────────────

  describe('playPlace', () => {
    it('creates a triangle oscillator at 150Hz', () => {
      soundEngine.playPlace();

      const osc = getLastOscillator();
      expect(osc.type).toBe('triangle');
      expect(osc.frequency.value).toBe(150);
    });

    it('creates noise via buffer source', () => {
      soundEngine.playPlace();

      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });
  });

  // ─── playCollapse ────────────────────────────────────────────────────

  describe('playCollapse', () => {
    it('creates immediate noise and sawtooth oscillator at 80Hz', () => {
      soundEngine.playCollapse();

      const osc = getLastOscillator();
      expect(osc.type).toBe('sawtooth');
      expect(osc.frequency.value).toBe(80);

      expect(mockCtx.createBufferSource).toHaveBeenCalled(); // noise
    });

    it('schedules 2 more sounds via timers at 200ms (noise) and 400ms (60Hz osc)', () => {
      const before = oscillatorCount();
      soundEngine.playCollapse();

      // Immediate: noise + sawtooth 80Hz → 1 oscillator
      expect(oscillatorCount()).toBe(before + 1);

      vi.advanceTimersByTime(199);
      expect(oscillatorCount()).toBe(before + 1); // nothing yet

      vi.advanceTimersByTime(1); // total 200ms — playNoise, no oscillator
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(2); // immediate noise + scheduled noise
      expect(oscillatorCount()).toBe(before + 1); // noise doesn't create an oscillator

      vi.advanceTimersByTime(200); // total 400ms — playTone (60Hz sawtooth)
      expect(oscillatorCount()).toBe(before + 2);
    });

    it('scheduled oscillator at 400ms is sawtooth 60Hz', () => {
      soundEngine.playCollapse();
      vi.advanceTimersByTime(400);

      // oscillator[0]=80Hz immediate, oscillator[1]=60Hz at 400ms
      const osc2 = getOscillator(1);
      expect(osc2.type).toBe('sawtooth');
      expect(osc2.frequency.value).toBe(60);
    });
  });

  // ─── playStabilize ──────────────────────────────────────────────────

  describe('playStabilize', () => {
    it('creates immediate sine oscillator at 660Hz', () => {
      soundEngine.playStabilize();

      const osc = getLastOscillator();
      expect(osc.type).toBe('sine');
      expect(osc.frequency.value).toBe(660);
    });

    it('schedules second sine at 880Hz after 100ms', () => {
      soundEngine.playStabilize();

      expect(oscillatorCount()).toBe(1);

      vi.advanceTimersByTime(99);
      expect(oscillatorCount()).toBe(1);

      vi.advanceTimersByTime(1);
      expect(oscillatorCount()).toBe(2);

      const osc2 = getOscillator(1);
      expect(osc2.frequency.value).toBe(880);
    });
  });

  // ─── playGameOver ──────────────────────────────────────────────────

  describe('playGameOver', () => {
    it('creates a sawtooth oscillator', () => {
      soundEngine.playGameOver();

      const osc = getLastOscillator();
      expect(osc.type).toBe('sawtooth');
    });

    it('sets frequency ramp from 440Hz to 80Hz over 1s', () => {
      soundEngine.playGameOver();

      const osc = getLastOscillator();
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
      expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(80, 1.0);
    });

    it('sets gain ramp from 0.15 to silence over 1.2s', () => {
      soundEngine.playGameOver();

      const gain = getLastGain();
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.15, 0);
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 1.2);
    });

    it('starts and stops oscillator with 1.2s duration', () => {
      soundEngine.playGameOver();

      const osc = getLastOscillator();
      expect(osc.start).toHaveBeenCalledWith(0);
      expect(osc.stop).toHaveBeenCalledWith(1.2);
    });
  });

  // ─── playAchievementUnlock ───────────────────────────────────────────

  describe('playAchievementUnlock', () => {
    it('creates immediate oscillator at middle C (523Hz)', () => {
      soundEngine.playAchievementUnlock();

      expect(oscillatorCount()).toBe(1);
      const osc1 = getOscillator(0);
      expect(osc1.type).toBe('sine');
      expect(osc1.frequency.value).toBe(523);
    });

    it('schedules ascending arpeggio: E5(659) → G5(784) → C6(1047)', () => {
      soundEngine.playAchievementUnlock();

      vi.advanceTimersByTime(120);
      expect(oscillatorCount()).toBe(2);
      expect(getOscillator(1).frequency.value).toBe(659);

      vi.advanceTimersByTime(120);
      expect(oscillatorCount()).toBe(3);
      expect(getOscillator(2).frequency.value).toBe(784);

      vi.advanceTimersByTime(120);
      expect(oscillatorCount()).toBe(4);
      expect(getOscillator(3).frequency.value).toBe(1047);
    });
  });

  // ─── Integration tests ─────────────────────────────────────────────

  describe('integration', () => {
    it('volume=0 still creates nodes correctly', () => {
      getSettings.mockReturnValue({ volume: 0 });
      soundEngine.resumeAudio();

      const masterGain = getGain(0);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);

      soundEngine.playSelect();
      expect(oscillatorCount()).toBe(1);
    });

    it('multiple playSelect calls create separate oscillators', () => {
      soundEngine.playSelect();
      soundEngine.playSelect();
      soundEngine.playSelect();

      expect(oscillatorCount()).toBe(3);
    });

    it('playPull creates 1 buffer source + 1 oscillator', () => {
      soundEngine.playPull();

      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);
      expect(oscillatorCount()).toBe(1);
    });

    it('_resetInternalState resets cached AudioContext', () => {
      soundEngine.playSelect();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);

      soundEngine._resetInternalState();
      soundEngine.playSelect();
      expect(window.AudioContext).toHaveBeenCalledTimes(2); // fresh creation
    });
  });
});
