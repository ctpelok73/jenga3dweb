import { useCallback } from 'react';
import { isCollapsedBlock, FALLEN_Y } from '../domain/collapse';
import { playPlace, playCollapse, playStabilize, playGameOver } from '../soundEngine';
import { getBestScore, recordGame } from '../scoreTracker';
import { trackGameOver, trackRewardedVideoReward } from '../analyticsService';
import { recordCollapse, recordSuccessfulMove, recordSpeedRun, recordHardModeWin } from '../achievementsTracker';
import { recordDailyChallengeAttempt } from '../dailyChallengeTracker';
import { saveGameReplay } from '../shareService';
import { PLAYER_NAMES } from '../styles';
import * as gameActions from './useGameReducer';

const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

function buildCleanedBlocks(updatedBlocks) {
  return updatedBlocks.filter((b) => b.position[1] >= FALLEN_Y);
}

function computeCurrentHeight(blocks) {
  let maxLayer = 0;
  for (const b of blocks) {
    if (b.layer > maxLayer) maxLayer = b.layer;
  }
  return maxLayer + 1;
}

export function useGameSimulation({
  dispatch,
  playerMode,
  currentPlayer,
  isDailyChallengeMode,
  gameMode,
  difficulty,
  setAiThinking,
  showAchievementNotification,
  timersRef,
  latestTurnCountRef,
  replayMovesRef,
  gameIdRef,
  gameStartTimeRef,
  onOnlineCollapse,
}) {
  const handleDailyChallenge = useCallback((currentTurnCount, cleanedBlocks) => {
    if (!isDailyChallengeMode) return Promise.resolve();

    const currentHeight = computeCurrentHeight(cleanedBlocks);
    const timeMs = gameStartTimeRef ? Date.now() - gameStartTimeRef.current : undefined;
    return recordDailyChallengeAttempt(currentTurnCount, currentHeight, true, timeMs).then((challengeResult) => {
      if (challengeResult.completed) {
        dispatch(gameActions.setAnnouncement('Челлендж дня выполнен! 🎉'));
      }
    }).catch(() => {});
  }, [isDailyChallengeMode, dispatch, gameStartTimeRef]);

  const handleCollapseOutcome = useCallback((currentTurnCount, updatedBlocks) => {
    playCollapse();
    setAiThinking(false);

    const gameOverTimer = setTimeout(() => playGameOver(), 300);
    timersRef.current.push(gameOverTimer);

    recordGame(currentTurnCount, true);
    const best = getBestScore();
    const isNewRecord = currentTurnCount > best;
    trackGameOver(currentTurnCount, best, isNewRecord);

    const { newUnlocks } = recordCollapse(currentTurnCount);
    if (newUnlocks && newUnlocks.length > 0) {
      const achievementTimer = setTimeout(() => showAchievementNotification(newUnlocks), 1500);
      timersRef.current.push(achievementTimer);
    }

    if (gameMode === 'speed') {
      const { newUnlocks: speedUnlocks } = recordSpeedRun();
      if (speedUnlocks?.length > 0) {
        const t = setTimeout(() => showAchievementNotification(speedUnlocks), 1500);
        timersRef.current.push(t);
      }
    }
    if (difficulty === 'hard') {
      const { newUnlocks: hardUnlocks } = recordHardModeWin();
      if (hardUnlocks?.length > 0) {
        const t = setTimeout(() => showAchievementNotification(hardUnlocks), 1500);
        timersRef.current.push(t);
      }
    }

    handleDailyChallenge(currentTurnCount, updatedBlocks);

    if (replayMovesRef.current.length > 0) {
      try {
        saveGameReplay(gameIdRef.current, replayMovesRef.current, {
          totalMoves: currentTurnCount,
          collapsed: true,
          playerMode,
          date: Date.now(),
        });
      } catch (error) {
        // ignore storage/replay errors
      }
    }

    dispatch(gameActions.setScreenShake(true));
    const shakeTimer = setTimeout(() => dispatch(gameActions.setScreenShake(false)), 600);
    timersRef.current.push(shakeTimer);

    // For online mode, notify server AND set game over locally
    // Server will confirm/update the result via game_over message
    if (playerMode === 4 && onOnlineCollapse) {
      onOnlineCollapse();
      // Fall through to show game over immediately
    }

    dispatch(gameActions.setPhase(PHASE_GAME_OVER));
  }, [dispatch, playerMode, setAiThinking, showAchievementNotification, timersRef, replayMovesRef, gameIdRef, handleDailyChallenge, gameMode, difficulty, onOnlineCollapse]);

  const handleSuccessfulOutcome = useCallback((currentTurnCount, cleanedBlocks) => {
    playStabilize();
    const placeTimer = setTimeout(() => playPlace(), 150);
    timersRef.current.push(placeTimer);

    const { newUnlocks: successUnlocks } = recordSuccessfulMove(currentTurnCount);
    if (successUnlocks && successUnlocks.length > 0) {
      const successTimer = setTimeout(() => showAchievementNotification(successUnlocks), 300);
      timersRef.current.push(successTimer);
    }

    handleDailyChallenge(currentTurnCount, cleanedBlocks);

    if (playerMode === 2 || playerMode === 3) {
      setAiThinking(playerMode === 3 ? false : undefined);
      const nextPlayer = currentPlayer === 0 ? 1 : 0;
      dispatch(gameActions.setCurrentPlayer(nextPlayer));
      if (playerMode === 2) {
        dispatch(gameActions.setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`));
      } else {
        dispatch(gameActions.setMessage(nextPlayer === 1 ? '🤖 ИИ думает...' : `Ход: ${PLAYER_NAMES[0]}. Выберите блок.`));
      }
      return;
    }

    if (playerMode === 4) {
      setAiThinking(false);
      dispatch(gameActions.setSelectedId(null));
      dispatch(gameActions.setMessage('⏳ Ожидание подтверждения...'));
      return;
    }

    dispatch(gameActions.setMessage('Выберите блок.'));
  }, [dispatch, playerMode, currentPlayer, setAiThinking, showAchievementNotification, timersRef, handleDailyChallenge]);

  const handleSimulationComplete = useCallback(async (updatedBlocks) => {
    let hasCollapsed = false;
    for (const b of updatedBlocks) {
      if (isCollapsedBlock(b)) {
        hasCollapsed = true;
        break;
      }
    }

    const cleanedBlocks = buildCleanedBlocks(updatedBlocks);
    dispatch(gameActions.setBlocks(cleanedBlocks));
    dispatch(gameActions.setSimulatingBlockIds(null));

    const currentTurnCount = latestTurnCountRef.current;

    if (hasCollapsed) {
      handleCollapseOutcome(currentTurnCount, updatedBlocks);
      return;
    }

    handleSuccessfulOutcome(currentTurnCount, cleanedBlocks);
  }, [dispatch, latestTurnCountRef, handleCollapseOutcome, handleSuccessfulOutcome]);

  return { handleSimulationComplete };
}

export function continueAfterCollapseUpdate(prevBlocks) {
  return prevBlocks.filter((b) => !isCollapsedBlock(b));
}

export default useGameSimulation;
