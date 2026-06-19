import { useCallback } from 'react';
import * as gameActions from './useGameReducer';

/**
 * useDispatchers — хук, оборачивающий dispatch в стабильные useCallback-колбэки.
 * Все колбэки стабильны (пустой deps[]), т.к. dispatch не меняется.
 *
 * @param {Function} dispatch — dispatch из useReducer
 * @param {object} state — текущее состояние (нужно для функциональных обновлений)
 * @returns {object} — все setX колбэки
 */
export function useDispatchers(dispatch, state) {
  const setPhase = useCallback((v) => dispatch(gameActions.setPhase(v)), [dispatch]);
  const setBlocks = useCallback((v) => dispatch(gameActions.setBlocks(typeof v === 'function' ? v(state.blocks) : v)), [dispatch, state.blocks]);
  const setSelectedId = useCallback((v) => dispatch(gameActions.setSelectedId(v)), [dispatch]);
  const setMessage = useCallback((v) => dispatch(gameActions.setMessage(v)), [dispatch]);
  const setTurnCount = useCallback((v) => dispatch(gameActions.setTurnCount(typeof v === 'function' ? v(state.turnCount) : v)), [dispatch, state.turnCount]);
  const setSimulatingBlockIds = useCallback((v) => dispatch(gameActions.setSimulatingBlockIds(v)), [dispatch]);
  const bumpRestartKey = useCallback(() => dispatch({ type: gameActions.INCREMENT_RESTART_KEY }), [dispatch]);
  const setShowTutorial = useCallback((v) => dispatch(gameActions.setShowTutorial(v)), [dispatch]);
  const setPlayerMode = useCallback((v) => dispatch(gameActions.setPlayerMode(v)), [dispatch]);
  const setCurrentPlayer = useCallback((v) => dispatch(gameActions.setCurrentPlayer(typeof v === 'function' ? v(state.currentPlayer) : v)), [dispatch, state.currentPlayer]);
  const setLastMovedBlockId = useCallback((v) => dispatch(gameActions.setLastMovedBlockId(v)), [dispatch]);
  const setAchievementToast = useCallback((v) => dispatch(gameActions.setAchievementToast(v)), [dispatch]);
  const setShowSettings = useCallback((v) => dispatch(gameActions.setShowSettings(v)), [dispatch]);
  const setShowAchievements = useCallback((v) => dispatch(gameActions.setShowAchievements(v)), [dispatch]);
  const setShowPauseMenu = useCallback((v) => dispatch(gameActions.setShowPauseMenu(v)), [dispatch]);
  const setShowDailyChallenge = useCallback((v) => dispatch(gameActions.setShowDailyChallenge(v)), [dispatch]);
  const setIsDailyChallengeMode = useCallback((v) => dispatch(gameActions.setIsDailyChallengeMode(v)), [dispatch]);
  const setShowPurchase = useCallback((v) => dispatch(gameActions.setShowPurchase(v)), [dispatch]);
  const setKeyboardFocusId = useCallback((v) => dispatch(gameActions.setKeyboardFocusId(v)), [dispatch]);
  const setAnnouncement = useCallback((v) => dispatch(gameActions.setAnnouncement(v)), [dispatch]);
  const setContinuedAfterCollapse = useCallback((v) => dispatch(gameActions.setContinuedAfterCollapse(v)), [dispatch]);
  const setAdFree = useCallback((v) => dispatch(gameActions.setAdFree(v)), [dispatch]);
  const setScreenShake = useCallback((v) => dispatch(gameActions.setScreenShake(v)), [dispatch]);
  const setLastExtractionPosition = useCallback((v) => dispatch(gameActions.setLastExtractionPosition(v)), [dispatch]);
  const setGameMode = useCallback((v) => dispatch(gameActions.setGameMode(v)), [dispatch]);
  const setSpeedDuration = useCallback((v) => dispatch(gameActions.setSpeedDuration(v)), [dispatch]);
  const setAiThinking = useCallback((v) => dispatch(gameActions.setAiThinking(v)), [dispatch]);

  return {
    setPhase,
    setBlocks,
    setSelectedId,
    setMessage,
    setTurnCount,
    setSimulatingBlockIds,
    bumpRestartKey,
    setShowTutorial,
    setPlayerMode,
    setCurrentPlayer,
    setLastMovedBlockId,
    setAchievementToast,
    setShowSettings,
    setShowAchievements,
    setShowPauseMenu,
    setShowDailyChallenge,
    setIsDailyChallengeMode,
    setShowPurchase,
    setKeyboardFocusId,
    setAnnouncement,
    setContinuedAfterCollapse,
    setAdFree,
    setScreenShake,
    setLastExtractionPosition,
    setGameMode,
    setSpeedDuration,
    setAiThinking,
  };
}
