import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimers } from '../hooks/useTimers';

function createProps(overrides = {}) {
  return {
    phase: 'playing',
    simulatingBlockIds: null,
    turnCount: 0,
    moveTimerSetting: 0,
    selectedId: null,
    executeMoveRef: { current: vi.fn() },
    onGameOver: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimers', () => {
  describe('speed timer', () => {
    it('startSpeedTimer sets speedTimeLeft to duration', () => {
      const props = createProps();
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.speedTimeLeft).toBeNull();

      act(() => result.current.startSpeedTimer(60));

      expect(result.current.speedTimeLeft).toBe(60);
    });

    it('clearSpeedTimer resets speedTimeLeft to null', () => {
      const props = createProps();
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      act(() => result.current.startSpeedTimer(60));
      expect(result.current.speedTimeLeft).toBe(60);

      act(() => result.current.clearSpeedTimer());
      expect(result.current.speedTimeLeft).toBeNull();
    });

    it('speed timer counts down each second', () => {
      const props = createProps();
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      act(() => result.current.startSpeedTimer(5));

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.speedTimeLeft).toBe(4);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.speedTimeLeft).toBe(3);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.speedTimeLeft).toBe(2);
    });

    it('speed timer calls onGameOver when reaching 0', () => {
      const onGameOver = vi.fn();
      const props = createProps({ onGameOver });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      act(() => result.current.startSpeedTimer(3));

      expect(onGameOver).not.toHaveBeenCalled();

      act(() => vi.advanceTimersByTime(3000));

      expect(onGameOver).toHaveBeenCalledTimes(1);
      expect(result.current.speedTimeLeft).toBe(0);
    });

    it('clearSpeedTimer prevents onGameOver from firing', () => {
      const onGameOver = vi.fn();
      const props = createProps({ onGameOver });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      act(() => result.current.startSpeedTimer(3));
      act(() => vi.advanceTimersByTime(1000));
      act(() => result.current.clearSpeedTimer());

      act(() => vi.advanceTimersByTime(3000));

      expect(onGameOver).not.toHaveBeenCalled();
    });
  });

  describe('move timer', () => {
    it('counts down when phase=playing and moveTimerSetting > 0', () => {
      const props = createProps({ moveTimerSetting: 5 });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.moveTimeLeft).toBe(5);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.moveTimeLeft).toBe(4);

      act(() => vi.advanceTimersByTime(1000));
      expect(result.current.moveTimeLeft).toBe(3);
    });

    it('resets to null when moveTimerSetting is 0', () => {
      const props = createProps({ moveTimerSetting: 0 });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.moveTimeLeft).toBeNull();
    });

    it('resets to null when phase is not playing', () => {
      const props = createProps({ phase: 'start', moveTimerSetting: 5 });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.moveTimeLeft).toBeNull();
    });

    it('resets to null when simulatingBlockIds is not null', () => {
      const props = createProps({ moveTimerSetting: 5, simulatingBlockIds: ['a'] });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.moveTimeLeft).toBeNull();
    });

    it('auto-executes move via executeMoveRef when timer reaches 0', () => {
      const executeMove = vi.fn();
      const executeMoveRef = { current: executeMove };
      const props = createProps({ moveTimerSetting: 2, selectedId: 'block-1', executeMoveRef });
      const { result } = renderHook((p) => useTimers(p), { initialProps: props });

      expect(result.current.moveTimeLeft).toBe(2);

      act(() => vi.advanceTimersByTime(2000));

      expect(executeMove).toHaveBeenCalledWith(null);
      expect(result.current.moveTimeLeft).toBeNull();
    });

    it('resets timer when turnCount changes', () => {
      const props = createProps({ moveTimerSetting: 5, turnCount: 0 });
      const { result, rerender } = renderHook((p) => useTimers(p), { initialProps: props });

      act(() => vi.advanceTimersByTime(3000));
      expect(result.current.moveTimeLeft).toBe(2);

      rerender(createProps({ moveTimerSetting: 5, turnCount: 1 }));
      expect(result.current.moveTimeLeft).toBe(5);
    });
  });
});
