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

// ─── useGameSimulation ──────────────────────────────────────────────────────
//
// Owns the post-physics aftermath — the largest single side-effect block in
// the game. Returns one callback:
//
//   handleSimulationComplete(updatedBlocks): called by GameSceneWithPhysics
//     once Rapier reaches a stable resting state (or hits the safety timeout).
//     If any block is below the collapse threshold: play collapse SFX, fire
//     analytics + score + achievement events, save replay, screen shake,
//     transition to PHASE_GAME_OVER. Otherwise: play stabilize/place,
//     update win streak, swap players, record daily-challenge progress.
//
// `handleContinueAfterCollapse` (the rewarded-video continue path) stays in
// App.jsx, which has access to the function-aware setBlocks shim. The hook
// exports a pure helper `continueAfterCollapseUpdate` for it.
//
// Parameters:
//   dispatch                 — the useReducer dispatch (for direct gameActions.* calls)
//   playerMode               — current playerMode from state
//   currentPlayer            — current player index from state
//   isDailyChallengeMode     — boolean from state
//   setAiThinking            — setter returned by useAIPlayer (NOT in reducer state)
//   showAchievementNotification — from useAchievementToasts; used for unlocks
//   timersRef                — shared with useAchievementToasts; we push timeouts
//                              for delayed game-over sound, screen shake, etc.
//                              so resetRoundState can clear them on restart.
//   latestTurnCountRef       — ref synced with turnCount each move; we read
//                              the freshest value (closure would be stale).
//   replayMovesRef           — ref accumulating replay frames during the game.
//   gameIdRef                — ref holding current game id (refreshed per round).
//
// ─────────────────────────────────────────────────────────────────────────────

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

    const cleanedBlocks = updatedBlocks.filter((b) => b.position[1] >= FALLEN_Y);
    dispatch(gameActions.setBlocks(cleanedBlocks));
    dispatch(gameActions.setSimulatingBlockIds(null));

    const currentTurnCount = latestTurnCountRef.current;

    if (hasCollapsed) {
      playCollapse();
      setAiThinking(false);
      const t1 = setTimeout(() => playGameOver(), 300);
      timersRef.current.push(t1);
      recordGame(currentTurnCount, true);
      const best = getBestScore();
      const isNewRecord = currentTurnCount > best;
      trackGameOver(currentTurnCount, best, isNewRecord);

      const { newUnlocks } = recordCollapse(currentTurnCount);
      if (newUnlocks && newUnlocks.length > 0) {
        const t2 = setTimeout(() => showAchievementNotification(newUnlocks), 1500);
        timersRef.current.push(t2);
      }

      if (isDailyChallengeMode) {
        let maxLayer = 0;
        for (const b of updatedBlocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const currentHeight = maxLayer + 1;
        const challengeResult = await recordDailyChallengeAttempt(currentTurnCount, currentHeight, false);
        if (challengeResult.completed) {
          dispatch(gameActions.setAnnouncement('Челлендж дня выполнен! 🎉'));
        }
      }

      // Save replay for this game
      if (replayMovesRef.current.length > 0) {
        try {
          saveGameReplay(gameIdRef.current, replayMovesRef.current, {
            totalMoves: currentTurnCount,
            collapsed: true,
            playerMode,
            date: Date.now(),
          });
        } catch (e) { /* ignore storage errors */ }
      }

      dispatch(gameActions.setScreenShake(true));
      const shakeTimer = setTimeout(() => dispatch(gameActions.setScreenShake(false)), 600);
      timersRef.current.push(shakeTimer);

      dispatch(gameActions.setPhase(PHASE_GAME_OVER));
    } else {
      playStabilize();
      const t3 = setTimeout(() => playPlace(), 150);
      timersRef.current.push(t3);

      // Reset consecutiveLosses, bump winStreak on a successful round
      const { newUnlocks: successUnlocks } = recordSuccessfulMove(currentTurnCount);
      if (successUnlocks && successUnlocks.length > 0) {
        const t4 = setTimeout(() => showAchievementNotification(successUnlocks), 300);
        timersRef.current.push(t4);
      }

      if (isDailyChallengeMode) {
        let maxLayer = 0;
        for (const b of cleanedBlocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const currentHeight = maxLayer + 1;
        const challengeResult = await recordDailyChallengeAttempt(currentTurnCount, currentHeight, true);
        if (challengeResult.completed) {
          dispatch(gameActions.setAnnouncement('Челлендж дня выполнен! 🎉'));
        }
      }

      if (playerMode === 2) {
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        dispatch(gameActions.setCurrentPlayer(nextPlayer));
        dispatch(gameActions.setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`));
      } else if (playerMode === 3) {
        setAiThinking(false);
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        dispatch(gameActions.setCurrentPlayer(nextPlayer));
        dispatch(gameActions.setMessage(nextPlayer === 1 ? '🤖 ИИ думает...' : `Ход: ${PLAYER_NAMES[0]}. Выберите блок.`));
      } else {
        dispatch(gameActions.setMessage('Выберите блок.'));
      }
    }
  }, [dispatch, playerMode, currentPlayer, isDailyChallengeMode, setAiThinking, showAchievementNotification, timersRef, latestTurnCountRef, replayMovesRef, gameIdRef]);

  return { handleSimulationComplete };
}

// Helper used by App.jsx's handleContinueAfterCollapse — kept exported so
// callers can run it inline against their own setBlocks shim (which supports
// function updaters). The hook itself does not call it.
export function continueAfterCollapseUpdate(prevBlocks) {
  return prevBlocks.filter((b) => !isCollapsedBlock(b));
}

export default useGameSimulation;
