import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import useGameSimulation, { continueAfterCollapseUpdate } from '../hooks/useGameSimulation';
import { FALLEN_Y } from '../domain/collapse';

// Import mocked modules directly so we can manipulate mocks in tests
import * as achievementsTracker from '../achievementsTracker';
import * as soundEngine from '../soundEngine';
import * as scoreTracker from '../scoreTracker';
import * as shareService from '../shareService';
import * as dailyChallengeTracker from '../dailyChallengeTracker';
import * as analyticsService from '../analyticsService';
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
  recordSpeedRun: vi.fn(() => ({ newUnlocks: [] })),
  recordHardModeWin: vi.fn(() => ({ newUnlocks: [] })),
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
  setSelectedId: vi.fn((id) => ({ type: 'SET_SELECTED_ID', payload: id })),
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

  // ─── Collapse path — handleCollapseOutcome branches ────────────────

  describe('collapse outcome', () => {
    function collapsedBlocks() {
      return [
        { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
        { id: 'b1', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 1 },
      ];
    }

    it('records game and tracks analytics on collapse', async () => {
      const { result } = renderHookWithDefaults();
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(scoreTracker.recordGame).toHaveBeenCalledWith(0, true);
      expect(scoreTracker.getBestScore).toHaveBeenCalled();
      expect(analyticsService.trackGameOver).toHaveBeenCalledWith(0, 0, false);
    });

    it('calls recordCollapse and registers timer for achievement notification on collapse', async () => {
      achievementsTracker.recordCollapse.mockReturnValue({ newUnlocks: [{ id: 'first_collapse' }] });

      const { result, timersRef } = renderHookWithDefaults();
      const prevTimerCount = timersRef.current.length;

      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(achievementsTracker.recordCollapse).toHaveBeenCalled();
      // More timers were registered for achievement notifications
      expect(timersRef.current.length).toBeGreaterThan(prevTimerCount);
    });

    it('calls recordSpeedRun when gameMode is speed on collapse', async () => {
      const { result } = renderHookWithDefaults({ gameMode: 'speed' });
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(achievementsTracker.recordSpeedRun).toHaveBeenCalled();
    });

    it('calls recordHardModeWin when difficulty is hard on collapse', async () => {
      const { result } = renderHookWithDefaults({ difficulty: 'hard' });
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(achievementsTracker.recordHardModeWin).toHaveBeenCalled();
    });

    it('registers timers for speed and hard unlock achievements', async () => {
      achievementsTracker.recordSpeedRun.mockReturnValue({ newUnlocks: [{ id: 'speed_demon' }] });
      achievementsTracker.recordHardModeWin.mockReturnValue({ newUnlocks: [{ id: 'hard_winner' }] });

      const { result, timersRef } = renderHookWithDefaults({
        gameMode: 'speed',
        difficulty: 'hard',
      });

      await result.current.handleSimulationComplete(collapsedBlocks());

      // Should have at least: gameOverTimer, shakeTimer, speedUnlockTimer, hardUnlockTimer
      expect(timersRef.current.length).toBeGreaterThanOrEqual(4);
    });

    it('dispatches screenShake true then queues the false timer', async () => {
      const { result, dispatch } = renderHookWithDefaults();
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setScreenShake(true));
    });

    it('saves replay when replayMovesRef has items on collapse', async () => {
      const replayMovesRef = { current: [{ blockId: 1, slot: [0, 0, 0] }] };
      const gameIdRef = { current: 'test-replay' };
      const { result } = renderHookWithDefaults({ replayMovesRef, gameIdRef });
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(shareService.saveGameReplay).toHaveBeenCalledWith(
        'test-replay',
        replayMovesRef.current,
        expect.objectContaining({ totalMoves: 0, collapsed: true, playerMode: 1 }),
      );
    });

    it('calls onOnlineCollapse in online mode', async () => {
      const onOnlineCollapse = vi.fn();
      const { result } = renderHookWithDefaults({
        playerMode: 4,
        onOnlineCollapse,
      });
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(onOnlineCollapse).toHaveBeenCalled();
    });

    it('still dispatches gameOver in online mode (falls through)', async () => {
      const onOnlineCollapse = vi.fn();
      const { result, dispatch } = renderHookWithDefaults({
        playerMode: 4,
        onOnlineCollapse,
      });
      await result.current.handleSimulationComplete(collapsedBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setPhase('gameOver'));
    });
  });

  // ─── Success path — handleSuccessfulOutcome branches ───────────────

  describe('successful outcome', () => {
    function stableBlocks() {
      return [
        { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
        { id: 'b1', position: [0, 2.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 1 },
      ];
    }

    it('sets solo message for playerMode 1', async () => {
      const { result, dispatch } = renderHookWithDefaults({ playerMode: 1 });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage('Выберите блок.'));
    });

    it('switches to player 1 on successful PvP move from player 0', async () => {
      const { result, dispatch } = renderHookWithDefaults({ playerMode: 2, currentPlayer: 0 });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(1));
      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage(expect.stringContaining('Игрок 2')));
    });

    it('switches to player 0 on successful PvP move from player 1', async () => {
      const { result, dispatch } = renderHookWithDefaults({ playerMode: 2, currentPlayer: 1 });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(0));
      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage(expect.stringContaining('Игрок 1')));
    });

    it('switches to AI player on successful solo-then-AI move', async () => {
      const { result, dispatch, setAiThinking } = renderHookWithDefaults({
        playerMode: 3,
        currentPlayer: 0,
      });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(setAiThinking).toHaveBeenCalledWith(false);
      expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(1));
      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage(expect.stringContaining('🤖')));
    });

    it('switches to human player on successful AI-then-solo move', async () => {
      const { result, dispatch, setAiThinking } = renderHookWithDefaults({
        playerMode: 3,
        currentPlayer: 1,
      });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(setAiThinking).toHaveBeenCalledWith(false);
      expect(dispatch).toHaveBeenCalledWith(gameActions.setCurrentPlayer(0));
      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage(expect.stringContaining('Игрок 1')));
    });

    it('sets online waiting message for playerMode 4', async () => {
      const { result, dispatch } = renderHookWithDefaults({ playerMode: 4 });
      await result.current.handleSimulationComplete(stableBlocks());

      expect(dispatch).toHaveBeenCalledWith(gameActions.setMessage('⏳ Ожидание подтверждения...'));
      expect(dispatch).toHaveBeenCalledWith(gameActions.setSelectedId(null));
    });

    it('registers place sound timer on success', async () => {
      const { result, timersRef } = renderHookWithDefaults();
      await result.current.handleSimulationComplete(stableBlocks());

      expect(timersRef.current.length).toBeGreaterThan(0);
    });
  });

  // ─── Daily challenge branches ──────────────────────────────────────

  describe('daily challenge', () => {
    function someBlocks() {
      return [
        { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
    }

    it('does not call recordDailyChallengeAttempt when not in challenge mode', async () => {
      const { result } = renderHookWithDefaults({ isDailyChallengeMode: false });
      await result.current.handleSimulationComplete(someBlocks());

      expect(dailyChallengeTracker.recordDailyChallengeAttempt).not.toHaveBeenCalled();
    });

    it('calls recordDailyChallengeAttempt when in challenge mode (success)', async () => {
      const { result, latestTurnCountRef } = renderHookWithDefaults({
        isDailyChallengeMode: true,
        gameStartTimeRef: { current: 1000 },
      });
      latestTurnCountRef.current = 5;

      await result.current.handleSimulationComplete(someBlocks());

      expect(dailyChallengeTracker.recordDailyChallengeAttempt).toHaveBeenCalledWith(
        5,
        expect.any(Number),
        true,
        expect.any(Number),
      );
    });

    it('calls recordDailyChallengeAttempt when in challenge mode (collapse)', async () => {
      const { result, latestTurnCountRef } = renderHookWithDefaults({
        isDailyChallengeMode: true,
        gameStartTimeRef: { current: 1000 },
      });
      latestTurnCountRef.current = 3;

      const collapsed = [
        { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
      await result.current.handleSimulationComplete(collapsed);

      expect(dailyChallengeTracker.recordDailyChallengeAttempt).toHaveBeenCalled();
    });

    it('dispatches announcement when daily challenge is completed', async () => {
      dailyChallengeTracker.recordDailyChallengeAttempt.mockResolvedValue({ completed: true });

      const { result, dispatch } = renderHookWithDefaults({
        isDailyChallengeMode: true,
      });

      await result.current.handleSimulationComplete(someBlocks());

      // The announcement is dispatched asynchronously in the .then() handler
      // handleDailyChallenge is called but NOT awaited, so we need to wait a tick
      await vi.waitFor(() => {
        expect(dispatch).toHaveBeenCalledWith(gameActions.setAnnouncement('Челлендж дня выполнен! 🎉'));
      }, { timeout: 1000 });
    });

    it('does not throw when recordDailyChallengeAttempt rejects', async () => {
      dailyChallengeTracker.recordDailyChallengeAttempt.mockRejectedValue(new Error('network error'));

      const { result } = renderHookWithDefaults({
        isDailyChallengeMode: true,
      });

      await expect(
        result.current.handleSimulationComplete(someBlocks()),
      ).resolves.not.toThrow();
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('handles collapse when replayMovesRef is empty', async () => {
      const { result, dispatch } = renderHookWithDefaults();
      const collapsed = [
        { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
      await result.current.handleSimulationComplete(collapsed);

      expect(shareService.saveGameReplay).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(gameActions.setPhase('gameOver'));
    });

    it('handles saveGameReplay error gracefully', async () => {
      shareService.saveGameReplay.mockImplementation(() => { throw new Error('storage full'); });

      const replayMovesRef = { current: [{ blockId: 1, slot: [0, 0, 0] }] };
      const { result, dispatch } = renderHookWithDefaults({ replayMovesRef });

      const collapsed = [
        { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
      await expect(
        result.current.handleSimulationComplete(collapsed),
      ).resolves.not.toThrow();

      expect(dispatch).toHaveBeenCalledWith(gameActions.setPhase('gameOver'));
    });

    it('calls playStabilize on successful move', async () => {
      const { result } = renderHookWithDefaults();

      const stable = [
        { id: 'b0', position: [0, 1.0, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
      await result.current.handleSimulationComplete(stable);

      // playStabilize is called synchronously, playPlace is via setTimeout(150ms)
      expect(soundEngine.playStabilize).toHaveBeenCalled();
    });

    it('calls playCollapse on collapse', async () => {
      const { result } = renderHookWithDefaults();

      const collapsed = [
        { id: 'b0', position: [0, FALLEN_Y - 1, 0], rotation: [0, 0, 0, 1], color: '#fff', layer: 0 },
      ];
      await result.current.handleSimulationComplete(collapsed);

      expect(soundEngine.playCollapse).toHaveBeenCalled();
    });
  });
});
