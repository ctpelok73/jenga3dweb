import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useGameSimulation, { continueAfterCollapseUpdate } from '../hooks/useGameSimulation';
import { FALLEN_Y } from '../domain/collapse';
import { BLOCK_H, LAYER_GAP } from '../towerConfig';
import * as gameActions from '../hooks/useGameReducer';

vi.mock('../soundEngine', () => ({
  playPlace: vi.fn(),
  playCollapse: vi.fn(),
  playStabilize: vi.fn(),
  playGameOver: vi.fn(),
}));

vi.mock('../scoreTracker', () => ({
  getBestScore: vi.fn(() => 0),
  recordGame: vi.fn(),
}));

vi.mock('../analyticsService', () => ({
  trackGameOver: vi.fn(),
  trackRewardedVideoReward: vi.fn(),
}));

vi.mock('../achievementsTracker', () => ({
  recordCollapse: vi.fn(() => ({ newUnlocks: [] })),
  recordSuccessfulMove: vi.fn(() => ({ newUnlocks: [] })),
}));

vi.mock('../dailyChallengeTracker', () => ({
  recordDailyChallengeAttempt: vi.fn(() => Promise.resolve({ completed: false })),
}));

vi.mock('../shareService', () => ({
  saveGameReplay: vi.fn(),
}));

vi.mock('../styles', () => ({
  PLAYER_NAMES: ['Игрок 1', 'Игрок 2', '🤖 ИИ'],
}));

vi.mock('../hooks/useGameReducer', () => ({
  setBlocks: vi.fn((blocks) => ({ type: 'SET_BLOCKS', payload: blocks })),
  setSimulatingBlockIds: vi.fn((ids) => ({ type: 'SET_SIMULATING_BLOCK_IDS', payload: ids })),
  setPhase: vi.fn((phase) => ({ type: 'SET_PHASE', payload: phase })),
  setScreenShake: vi.fn((v) => ({ type: 'SET_SCREEN_SHAKE', payload: v })),
  setAnnouncement: vi.fn((msg) => ({ type: 'SET_ANNOUNCEMENT', payload: msg })),
  setCurrentPlayer: vi.fn((p) => ({ type: 'SET_CURRENT_PLAYER', payload: p })),
  setMessage: vi.fn((msg) => ({ type: 'SET_MESSAGE', payload: msg })),
}));

function makeBlock(layer, id = `block-${layer}`, yOverride) {
  const expectedY = layer >= 0 ? layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2 : FALLEN_Y - 1;
  return {
    id,
    position: [0, yOverride !== undefined ? yOverride : expectedY, 0],
    rotation: [0, 0, 0, 1],
    color: '#8B7355',
    layer,
  };
}

describe('continueAfterCollapseUpdate', () => {
  it('removes blocks below FALLEN_Y', () => {
    const blocks = [
      makeBlock(0, 'b0', 1.0),
      makeBlock(1, 'b1', -0.6),
      makeBlock(2, 'b2', 2.0),
    ];
    const result = continueAfterCollapseUpdate(blocks);
    expect(result.map((b) => b.id)).toEqual(['b0', 'b2']);
  });

  it('keeps all blocks when none collapsed', () => {
    const blocks = [makeBlock(0, 'b0', 1.0), makeBlock(1, 'b1', 2.0)];
    const result = continueAfterCollapseUpdate(blocks);
    expect(result.length).toBe(2);
  });

  it('returns empty array for empty input', () => {
    expect(continueAfterCollapseUpdate([])).toEqual([]);
  });

  it('removes blocks that dropped more than 3 layers', () => {
    const drop = (BLOCK_H + LAYER_GAP) * 3 + 0.1;
    const blocks = [
      makeBlock(5, 'b5', 5 * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2),
      makeBlock(5, 'b5-dropped', 5 * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2 - drop),
    ];
    const result = continueAfterCollapseUpdate(blocks);
    expect(result.map((b) => b.id)).toEqual(['b5']);
  });

  it('removes all blocks when every block collapsed', () => {
    const blocks = [makeBlock(0, 'b0', -1), makeBlock(1, 'b1', -2)];
    const result = continueAfterCollapseUpdate(blocks);
    expect(result).toEqual([]);
  });
});

describe('useGameSimulation', () => {
  function renderHookWithDefaults(overrides = {}) {
    const dispatch = vi.fn();
    const timersRef = { current: [] };
    const latestTurnCountRef = { current: 0 };
    const replayMovesRef = { current: [] };
    const gameIdRef = { current: 'test-game' };
    const setAiThinking = vi.fn();
    const showAchievementNotification = vi.fn();

    const defaults = {
      dispatch,
      playerMode: 1,
      currentPlayer: 0,
      isDailyChallengeMode: false,
      setAiThinking,
      showAchievementNotification,
      timersRef,
      latestTurnCountRef,
      replayMovesRef,
      gameIdRef,
      ...overrides,
    };

    return {
      ...renderHook(() => useGameSimulation(defaults)),
      dispatch,
      timersRef,
      latestTurnCountRef,
      setAiThinking,
      showAchievementNotification,
    };
  }

  it('returns handleSimulationComplete function', () => {
    const { result } = renderHookWithDefaults();
    expect(typeof result.current.handleSimulationComplete).toBe('function');
  });

  it('dispatches cleaned blocks and clears simulatingBlockIds on successful move', async () => {
    const { result, dispatch } = renderHookWithDefaults();
    const stableBlocks = [
      { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      { id: 'b1', position: [0, 2.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 1 },
    ];

    await result.current.handleSimulationComplete(stableBlocks);

    expect(dispatch).toHaveBeenCalledWith(gameActions.setBlocks(stableBlocks));
    expect(dispatch).toHaveBeenCalledWith(gameActions.setSimulatingBlockIds(null));
  });

  it('sets gameOver phase on collapse', async () => {
    const { result, dispatch } = renderHookWithDefaults({ playerMode: 1 });
    const collapsedBlocks = [
      { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      { id: 'b1', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 1 },
    ];

    await result.current.handleSimulationComplete(collapsedBlocks);

    expect(dispatch).toHaveBeenCalledWith(gameActions.setPhase('gameOver'));
    expect(dispatch).toHaveBeenCalledWith(gameActions.setScreenShake(true));
  });

  it('clears aiThinking on collapse', async () => {
    const { result, setAiThinking } = renderHookWithDefaults({ playerMode: 3 });
    const collapsedBlocks = [
      { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
    ];

    await result.current.handleSimulationComplete(collapsedBlocks);

    expect(setAiThinking).toHaveBeenCalledWith(false);
  });

  it('switches player on successful PvP move', async () => {
    const { result, dispatch } = renderHookWithDefaults({ playerMode: 2, currentPlayer: 0 });
    const stableBlocks = [
      { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
    ];

    await result.current.handleSimulationComplete(stableBlocks);

    expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(1));
    expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage(expect.stringContaining('Игрок 2')));
  });

  it('clears aiThinking and switches player on successful AI mode move', async () => {
    const { result, dispatch, setAiThinking } = renderHookWithDefaults({
      playerMode: 3,
      currentPlayer: 0,
    });
    const stableBlocks = [
      { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
    ];

    await result.current.handleSimulationComplete(stableBlocks);

    expect(setAiThinking).toHaveBeenCalledWith(false);
    expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(1));
  });

  it('registers timers in timersRef on collapse', async () => {
    const { result, timersRef } = renderHookWithDefaults();
    const collapsedBlocks = [
      { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
    ];

    await result.current.handleSimulationComplete(collapsedBlocks);

    expect(timersRef.current.length).toBeGreaterThan(0);
  });
});
