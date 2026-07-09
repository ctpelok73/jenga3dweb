import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIPlayer } from '../hooks/useAIPlayer';

vi.mock('../aiControllerAdvanced', () => ({
  chooseAIBlockAdvanced: vi.fn(),
  aiPersonality: { adaptToPlayer: vi.fn() },
  minimaxAI: { findBestMove: vi.fn() },
}));

vi.mock('../aiController', () => ({
  computeAIDropSlot: vi.fn().mockReturnValue({ position: [0, 0, 0], rotation: [0, 0, 0], slotIndex: 0 }),
  AI_THINK_DELAY: 800,
  AI_MOVE_DELAY: 1200,
}));

vi.mock('../scoreTracker', () => ({
  getRecentHistory: vi.fn().mockReturnValue([]),
}));

import { chooseAIBlockAdvanced, aiPersonality, minimaxAI } from '../aiControllerAdvanced';
import { computeAIDropSlot, AI_THINK_DELAY, AI_MOVE_DELAY } from '../aiController';
import { getRecentHistory } from '../scoreTracker';

function createProps(overrides = {}) {
  return {
    playerMode: 3,
    currentPlayer: 1,
    phase: 'playing',
    simulatingBlockIds: null,
    blocksRef: { current: [] },
    topCompleteLayerRef: { current: 17 },
    executeMoveRef: { current: vi.fn() },
    currentSettings: { difficulty: 'normal' },
    onSelectBlock: vi.fn(),
    onMessage: vi.fn(),
    aiThinking: false,
    onAiThinkingChange: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  getRecentHistory.mockReturnValue([]);
  aiPersonality.adaptToPlayer.mockImplementation(() => {});
  chooseAIBlockAdvanced.mockReturnValue({ id: 5, layer: 3 });
  minimaxAI.findBestMove.mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAIPlayer', () => {
  it('triggers AI turn when all conditions are met', () => {
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(props.onAiThinkingChange).toHaveBeenCalledWith(true);
    expect(props.onMessage).toHaveBeenCalledWith('🤖 ИИ думает...');
    expect(chooseAIBlockAdvanced).toHaveBeenCalled();
  });

  it('does not trigger when phase is not playing', () => {
    const props = createProps({ phase: 'start' });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY * 5));

    expect(props.onAiThinkingChange).not.toHaveBeenCalled();
  });

  it('does not trigger when playerMode is not 3', () => {
    const props = createProps({ playerMode: 1 });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY * 5));

    expect(props.onAiThinkingChange).not.toHaveBeenCalled();
  });

  it('does not trigger when currentPlayer is not 1', () => {
    const props = createProps({ currentPlayer: 0 });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY * 5));

    expect(props.onAiThinkingChange).not.toHaveBeenCalled();
  });

  it('does not trigger when simulatingBlockIds is not null', () => {
    const props = createProps({ simulatingBlockIds: [1] });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY * 5));

    expect(props.onAiThinkingChange).not.toHaveBeenCalled();
  });

  it('does not trigger when aiThinking is true', () => {
    const props = createProps({ aiThinking: true });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY * 5));

    expect(props.onMessage).not.toHaveBeenCalledWith('🤖 ИИ думает...');
  });

  it('calls onAiThinkingChange(true) at start of AI turn', () => {
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    expect(props.onAiThinkingChange).toHaveBeenCalledWith(true);
  });

  it('calls onSelectBlock after AI thinks', () => {
    const aiBlock = { id: 7, layer: 2 };
    chooseAIBlockAdvanced.mockReturnValue(aiBlock);
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(props.onSelectBlock).toHaveBeenCalledWith(7);
  });

  it('does not crash when executeMoveRef.current is null', () => {
    const props = createProps({ executeMoveRef: { current: null } });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));
    act(() => vi.advanceTimersByTime(AI_MOVE_DELAY));

    expect(props.onSelectBlock).toHaveBeenCalled();
  });

  it('executes move after AI_MOVE_DELAY', () => {
    const aiBlock = { id: 3, layer: 5 };
    const dropSlot = { position: [1, 2, 3], rotation: [0, 1, 0], slotIndex: 1 };
    chooseAIBlockAdvanced.mockReturnValue(aiBlock);
    computeAIDropSlot.mockReturnValue(dropSlot);
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));
    expect(props.executeMoveRef.current).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(AI_MOVE_DELAY));
    expect(props.executeMoveRef.current).toHaveBeenCalledWith(dropSlot, aiBlock);
  });

  it('shows message when AI cannot find a block', () => {
    chooseAIBlockAdvanced.mockReturnValue(null);
    minimaxAI.findBestMove.mockReturnValue(null);
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(props.onAiThinkingChange).toHaveBeenCalledWith(true);
    expect(props.onMessage).toHaveBeenCalledWith('🤖 ИИ не может найти блок!');
  });

  it('uses minimaxAI on hard difficulty', () => {
    const aiBlock = { id: 4, layer: 1 };
    minimaxAI.findBestMove.mockReturnValue(aiBlock);
    const props = createProps({ currentSettings: { difficulty: 'hard' } });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(minimaxAI.findBestMove).toHaveBeenCalled();
    expect(props.onSelectBlock).toHaveBeenCalledWith(4);
  });

  it('calls adaptToPlayer when history is available', () => {
    getRecentHistory.mockReturnValue([
      { collapsed: false },
      { collapsed: true },
      { collapsed: false },
    ]);
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(aiPersonality.adaptToPlayer).toHaveBeenCalledWith({ playerWinRate: 2 / 3 });
  });

  it('does not call adaptToPlayer when history is empty', () => {
    getRecentHistory.mockReturnValue([]);
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(aiPersonality.adaptToPlayer).not.toHaveBeenCalled();
  });

  // ─── Hard difficulty: minimax null → falls back to heuristic ─────

  it('falls back to chooseAIBlockAdvanced when minimax returns null on hard', () => {
    minimaxAI.findBestMove.mockReturnValue(null);
    chooseAIBlockAdvanced.mockReturnValue({ id: 9, layer: 4 });
    const props = createProps({ currentSettings: { difficulty: 'hard' } });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(minimaxAI.findBestMove).toHaveBeenCalled();
    expect(chooseAIBlockAdvanced).toHaveBeenCalled();
    expect(props.onSelectBlock).toHaveBeenCalledWith(9);
  });

  // ─── Safety timeout ──────────────────────────────────────────────

  it('safety timeout resets aiThinking after 8000ms if move not executed', () => {
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));
    expect(props.onAiThinkingChange).toHaveBeenCalledWith(true);
    props.onAiThinkingChange.mockClear();

    // Do NOT advance to AI_MOVE_DELAY — simulate hang
    act(() => vi.advanceTimersByTime(8000));

    expect(props.onAiThinkingChange).toHaveBeenCalledWith(false);
  });

  // ─── computeAIDropSlot called with correct args ──────────────────

  it('calls computeAIDropSlot with currentBlocks and selected aiBlock', () => {
    const aiBlock = { id: 6, layer: 2 };
    chooseAIBlockAdvanced.mockReturnValue(aiBlock);
    const blocks = [{ id: 1 }, { id: 6, layer: 2 }];
    const props = createProps({ blocksRef: { current: blocks } });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    expect(computeAIDropSlot).toHaveBeenCalledWith(blocks, aiBlock);
  });

  // ─── onAiThinkingChange(false) NOT called on success ──────────────

  it('does not prematurely reset aiThinking when AI finds a block', () => {
    const props = createProps();
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    // Should NOT have been called with false after finding a block
    const falseCalls = props.onAiThinkingChange.mock.calls.filter(([v]) => v === false);
    expect(falseCalls).toHaveLength(0);
  });

  // ─── Cleanup on unmount ──────────────────────────────────────────

  it('clears AI timers on unmount (effect cleanup)', () => {
    const props = createProps();
    const { unmount } = renderHook((p) => useAIPlayer(p), { initialProps: props });

    // After unmount, timers should be cleared
    unmount();

    // If cleanup worked, advancing time should NOT trigger onAiThinkingChange again
    // (the think timer was cleared before it could fire)
    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    // onAiThinkingChange(true) was already called during mount
    expect(props.onAiThinkingChange).toHaveBeenCalledTimes(1);
  });

  // ─── Dep change cancels pending AI turn ──────────────────────────

  it('cancels pending AI turn when phase changes during thinking', () => {
    const props = createProps();
    const { rerender } = renderHook((p) => useAIPlayer(p), { initialProps: props });

    // Change phase to 'gameOver' before think delay fires
    rerender(createProps({ phase: 'gameOver' }));

    // The think timer should have been cancelled by cleanup
    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    // Should NOT have attempted to select a block
    expect(props.onSelectBlock).not.toHaveBeenCalled();
  });

  // ─── difficulty || 'normal' fallback ──────────────────────────────

  it('defaults to normal difficulty when currentSettings.difficulty is undefined', () => {
    chooseAIBlockAdvanced.mockReturnValue({ id: 2, layer: 1 });
    const props = createProps({ currentSettings: {} });
    renderHook((p) => useAIPlayer(p), { initialProps: props });

    act(() => vi.advanceTimersByTime(AI_THINK_DELAY));

    // Should call chooseAIBlockAdvanced with 'normal' (not 'hard' because no minimax)
    expect(minimaxAI.findBestMove).not.toHaveBeenCalled();
    expect(chooseAIBlockAdvanced).toHaveBeenCalled();
    expect(props.onSelectBlock).toHaveBeenCalled();
  });
});
