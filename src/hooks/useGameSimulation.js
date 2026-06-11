import { useCallback } from 'react';
import { isCollapsedBlock, FALLEN_Y } from '../domain/collapse';
import { playPlace, playCollapse, playStabilize, playGameOver } from '../soundEngine';
import { getBestScore, recordGame } from '../scoreTracker';
import { trackGameOver, trackRewardedVideoReward } from '../analyticsService';
import { recordCollapse, recordSuccessfulMove } from '../achievementsTracker';
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

function handleDailyChallenge({ isDailyChallengeMode, dispatch, currentTurnCount, cleanedBlocks, currentHeight }) {
  if (!isDailyChallengeMode) return Promise.resolve();

  return recordDailyChallengeAttempt(currentTurnCount, currentHeight, true).then((challengeResult) => {
    if (challengeResult.completed) {
      dispatch(gameActions.setAnnouncement('Челлендж дня выполнен! 🎉'));
    }
  });
}

function handleCollapseOutcome({ dispatch, timersRef, setAiThinking, showAchievementNotification, replayMovesRef, gameIdRef, currentTurnCount, playerMode, updatedBlocks }) {
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

  const currentHeight = computeCurrentHeight(updatedBlocks);
  handleDailyChallenge({ isDailyChallengeMode, dispatch, currentTurnCount, cleanedBlocks: updatedBlocks, currentHeight });

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

  dispatch(gameActions.setPhase(PHASE_GAME_OVER));
}

function handleSuccessfulOutcome({ dispatch, timersRef, playerMode, currentPlayer, setAiThinking, isDailyChallengeMode, currentTurnCount, cleanedBlocks }) {
  playStabilize();
  const placeTimer = setTimeout(() => playPlace(), 150);
  timersRef.current.push(placeTimer);

  const { newUnlocks: successUnlocks } = recordSuccessfulMove(currentTurnCount);
  if (successUnlocks && successUnlocks.length > 0) {
    const successTimer = setTimeout(() => showAchievementNotification(successUnlocks), 300);
    timersRef.current.push(successTimer);
  }

  const currentHeight = computeCurrentHeight(cleanedBlocks);
  handleDailyChallenge({ isDailyChallengeMode, dispatch, currentTurnCount, cleanedBlocks, currentHeight });

  if (playerMode === 2) {
    const nextPlayer = currentPlayer === 0 ? 1 : 0;
    dispatch(gameActions.setCurrentPlayer(nextPlayer));
    dispatch(gameActions.setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`));
    return;
  }

  if (playerMode === 3) {
    setAiThinking(false);
    const nextPlayer = currentPlayer === 0 ? 1 : 0;
    dispatch(gameActions.setCurrentPlayer(nextPlayer));
    dispatch(gameActions.setMessage(nextPlayer === 1 ? '🤖 ИИ думает...' : `Ход: ${PLAYER_NAMES[0]}. Выберите блок.`));
    return;
  }

  dispatch(gameActions.setMessage('Выберите блок.'));
}

export function useGameSimulation({
  dispatch,
  playerMode,
  currentPlayer,
  isDailyChallengeMode,
  setAiThinking,
  showAchievementNotification,
  timersRef,
  latestTurnCountRef,
  replayMovesRef,
  gameIdRef,
}) {
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
      handleCollapseOutcome({
        dispatch,
        timersRef,
        setAiThinking,
        showAchievementNotification,
        replayMovesRef,
        gameIdRef,
        currentTurnCount,
        playerMode,
        updatedBlocks,
      });
      return;
    }

    handleSuccessfulOutcome({
      dispatch,
      timersRef,
      playerMode,
      currentPlayer,
      setAiThinking,
      isDailyChallengeMode,
      currentTurnCount,
      cleanedBlocks,
    });
  }, [dispatch, playerMode, currentPlayer, isDailyChallengeMode, setAiThinking, showAchievementNotification, timersRef, latestTurnCountRef, replayMovesRef, gameIdRef]);

  return { handleSimulationComplete };
}

export function continueAfterCollapseUpdate(prevBlocks) {
  return prevBlocks.filter((b) => !isCollapsedBlock(b));
}

export default useGameSimulation;
