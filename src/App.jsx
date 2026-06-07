import React, { Suspense, lazy, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import InteractiveTutorialOverlay from './InteractiveTutorialOverlay';
import AriaAnnouncer from './AriaAnnouncer';
import AdBanner from './AdBanner';
import { PauseMenu } from './PauseMenu';
import AchievementToast from './components/AchievementToast';
import StartScreen from './screens/StartScreen';
import GameOverScreen from './screens/GameOverScreen';
import UIPanel from './screens/UIPanel';
import SettingsPanel from './screens/SettingsPanel';
import AchievementsPanel from './screens/AchievementsPanel';
import { PLAYER_NAMES } from './styles';
import { getTopCompleteLayer, getMaxLayer, getDropSlots, generateTower } from './domain/tower';
import { isCollapsedBlock, FALLEN_Y } from './domain/collapse';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, playAchievementUnlock, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, getRecentHistory, recordGame } from './scoreTracker';
import { initializeAnalytics, trackGameStart, trackGameOver, trackRewardedVideoReward } from './analyticsService';
import { initAdSDK, isAdFree } from './adService';
import { recordMove, recordCollapse, recordSuccessfulMove } from './achievementsTracker';
import { getSettings, getDifficultyDynamicIds, getThemeColors } from './settingsTracker';
import { cycleBlock, cycleInLayer, getSelectableBlocks, jumpToLayer } from './keyboardController';
import DailyChallengePanel from './DailyChallengePanel';
import { generateDailyTower, recordDailyChallengeAttempt } from './dailyChallengeTracker';
import PurchasePanel from './PurchasePanel';
import { isPremiumStoreAvailable, isRemoveAdsPurchased } from './purchaseService';
import { computeAIDropSlot, AI_THINK_DELAY, AI_MOVE_DELAY } from './aiController';
import { chooseAIBlockAdvanced, aiPersonality, minimaxAI } from './aiControllerAdvanced';
import { useTouchGestures } from './touchGestureController';
import { useMobileOptimizations } from './mobileOptimizations';
import { saveGameReplay, generateGameId, getChallengeFromUrl } from './shareService';
import useAIPlayer from './hooks/useAIPlayer';
import useKeyboardNavigation from './hooks/useKeyboardNavigation';
import useTimers from './hooks/useTimers';
import useGameReducer, * as gameActions from './hooks/useGameReducer';

const GameScene = lazy(() => import('./GameScene'));

const PHASE_START = 'start';
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

const TUTORIAL_KEY = 'jenga3d_tutorial_done';
function hasSeenTutorial() { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {} }

function SceneLoadingFallback() {
  return (
    <div className="j-loading-overlay">
      <div className="j-loading-overlay__icon">3D</div>
      <div className="j-loading-overlay__text">Загрузка сцены...</div>
      <div className="j-loading-overlay__bar">
        <div className="j-loading-overlay__progress" style={{ width: '45%' }} />
      </div>
    </div>
  );
}

function generateThemedTower() {
  return generateTower({ colors: getThemeColors() });
}

// ─── Функция ограничения динамических блоков для мобильных устройств ───
// Использует maxDynamicBlocks из настроек рендеринга
function capDynamicIdsForMobile(blocks, dynamicIds, moveBlock, removedLayer, maxDynamicBlocks = 7) {
  if (!dynamicIds || dynamicIds.size <= maxDynamicBlocks) return dynamicIds;

  const extractionX = moveBlock.position[0];
  const extractionZ = moveBlock.position[2];
  const candidates = blocks
    .filter((block) => dynamicIds.has(block.id))
    .map((block) => {
      const dx = block.position[0] - extractionX;
      const dz = block.position[2] - extractionZ;
      return {
        id: block.id,
        selected: block.id === moveBlock.id ? 0 : 1,
        layerDistance: Math.abs(block.layer - removedLayer),
        horizontalDistance: Math.sqrt(dx * dx + dz * dz),
      };
    })
    .sort((a, b) => (
      a.selected - b.selected ||
      a.layerDistance - b.layerDistance ||
      a.horizontalDistance - b.horizontalDistance ||
      a.id - b.id
    ));

  const capped = new Set(candidates.slice(0, maxDynamicBlocks).map((item) => item.id));
  capped.add(moveBlock.id);
  return capped;
}

function App() {
  const [state, dispatch] = useGameReducer(generateThemedTower);
  const {
    phase,
    blocks,
    selectedId,
    message,
    turnCount,
    simulatingBlockIds,
    restartKey,
    showTutorial,
    playerMode,
    currentPlayer,
    lastMovedBlockId,
    achievementToast,
    showSettings,
    showAchievements,
    showPauseMenu,
    showDailyChallenge,
    isDailyChallengeMode,
    showPurchase,
    keyboardFocusId,
    announcement,
    continuedAfterCollapse,
    adFree,
    screenShake,
    lastExtractionPosition,
    gameMode,
    speedDuration,
  } = state;

  const setPhase = useCallback((v) => dispatch(gameActions.setPhase(v)), []);
  const setBlocks = useCallback((v) => dispatch(gameActions.setBlocks(typeof v === 'function' ? v(state.blocks) : v)), [state.blocks]);
  const setSelectedId = useCallback((v) => dispatch(gameActions.setSelectedId(v)), []);
  const setMessage = useCallback((v) => dispatch(gameActions.setMessage(v)), []);
  const setTurnCount = useCallback((v) => dispatch(gameActions.setTurnCount(typeof v === 'function' ? v(state.turnCount) : v)), [state.turnCount]);
  const setSimulatingBlockIds = useCallback((v) => dispatch(gameActions.setSimulatingBlockIds(v)), []);
  const bumpRestartKey = useCallback(() => dispatch({ type: gameActions.INCREMENT_RESTART_KEY }), []);
  const setShowTutorial = useCallback((v) => dispatch(gameActions.setShowTutorial(v)), []);
  const setPlayerMode = useCallback((v) => dispatch(gameActions.setPlayerMode(v)), []);
  const setCurrentPlayer = useCallback((v) => dispatch(gameActions.setCurrentPlayer(typeof v === 'function' ? v(state.currentPlayer) : v)), [state.currentPlayer]);
  const setLastMovedBlockId = useCallback((v) => dispatch(gameActions.setLastMovedBlockId(v)), []);
  const setAchievementToast = useCallback((v) => dispatch(gameActions.setAchievementToast(v)), []);
  const setShowSettings = useCallback((v) => dispatch(gameActions.setShowSettings(v)), []);
  const setShowAchievements = useCallback((v) => dispatch(gameActions.setShowAchievements(v)), []);
  const setShowPauseMenu = useCallback((v) => dispatch(gameActions.setShowPauseMenu(v)), []);
  const setShowDailyChallenge = useCallback((v) => dispatch(gameActions.setShowDailyChallenge(v)), []);
  const setIsDailyChallengeMode = useCallback((v) => dispatch(gameActions.setIsDailyChallengeMode(v)), []);
  const setShowPurchase = useCallback((v) => dispatch(gameActions.setShowPurchase(v)), []);
  const setKeyboardFocusId = useCallback((v) => dispatch(gameActions.setKeyboardFocusId(v)), []);
  const setAnnouncement = useCallback((v) => dispatch(gameActions.setAnnouncement(v)), []);
  const setContinuedAfterCollapse = useCallback((v) => dispatch(gameActions.setContinuedAfterCollapse(v)), []);
  const setAdFree = useCallback((v) => dispatch(gameActions.setAdFree(v)), []);
  const setScreenShake = useCallback((v) => dispatch(gameActions.setScreenShake(v)), []);
  const setLastExtractionPosition = useCallback((v) => dispatch(gameActions.setLastExtractionPosition(v)), []);
  const setGameMode = useCallback((v) => dispatch(gameActions.setGameMode(v)), []);
  const setSpeedDuration = useCallback((v) => dispatch(gameActions.setSpeedDuration(v)), []);

  // Lazy initial value for adFree (the reducer defaults to false; sync the real value on mount)
  useEffect(() => {
    if (isAdFree() || isRemoveAdsPurchased()) dispatch(gameActions.setAdFree(true));
  }, []);

  const selectionTimeRef = useRef(null);
  const achievementToastTimers = useRef([]);
  const latestTurnCountRef = useRef(0);
  const executeMoveRef = useRef(null);
  const blocksRef = useRef(null);
  const topCompleteLayerRef = useRef(null);
  const canvasRef = useRef(null);
  const replayMovesRef = useRef([]);
  const gameIdRef = useRef(generateGameId());
  const { shouldOptimize, renderSettings, deviceLevel, maxDynamicBlocks } = useMobileOptimizations();
  const [currentSettings, setCurrentSettings] = useState(() => getSettings());

  const clearRuntimeTimers = useCallback(() => {
    achievementToastTimers.current.forEach(id => clearTimeout(id));
    achievementToastTimers.current = [];
  }, []);

  const resetRoundState = useCallback(() => {
    setSelectedId(null);
    setTurnCount(0);
    latestTurnCountRef.current = 0;
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setLastMovedBlockId(null);
    setContinuedAfterCollapse(false);
    setKeyboardFocusId(null);
    setAnnouncement('');
    setAiThinking(false);
    setLastExtractionPosition(null);
    selectionTimeRef.current = null;
    replayMovesRef.current = [];
    gameIdRef.current = generateGameId();
    clearRuntimeTimers();
  }, [clearRuntimeTimers]);

  const towerHeight = useMemo(() => getMaxLayer(blocks) + 1, [blocks]);

  const topCompleteLayer = useMemo(() => getTopCompleteLayer(blocks), [blocks]);

  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedId) || null, [blocks, selectedId]);
  const canMove = selectedBlock !== null && phase === PHASE_PLAYING && simulatingBlockIds === null && selectedBlock.layer < topCompleteLayer;

  const dropSlots = useMemo(() => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return null;
    return getDropSlots(blocks);
  }, [blocks, selectedBlock, phase, simulatingBlockIds]);

  useEffect(() => {
    initializeAnalytics();
    initAdSDK();
    const handler = () => { resumeAudio(); };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    try {
      const challenge = getChallengeFromUrl();
      if (challenge) {
        // Auto-start with challenge configuration
        setMessage('Вызов от друга принят!');
      }
    } catch (e) { /* ignore */ }
  }, []);

  const showAchievementNotification = useCallback((newUnlocks) => {
    if (newUnlocks && newUnlocks.length > 0) {
      achievementToastTimers.current.forEach(id => clearTimeout(id));
      achievementToastTimers.current = [];
      playAchievementUnlock();
      let idx = 0;
      const showNext = () => {
        if (idx < newUnlocks.length) {
          setAchievementToast(newUnlocks[idx]);
          idx++;
          const t1 = setTimeout(() => {
            setAchievementToast(null);
            const t2 = setTimeout(showNext, 300);
            achievementToastTimers.current.push(t2);
          }, 3500);
          achievementToastTimers.current.push(t1);
        }
      };
      showNext();
    }
  }, []);

  const handleSpeedTimeout = useCallback(() => {
    setPhase(PHASE_GAME_OVER);
    playGameOver();
    recordGame(latestTurnCountRef.current, false);
  }, []);

  const { moveTimeLeft, speedTimeLeft, startSpeedTimer, clearSpeedTimer } = useTimers({
    phase,
    simulatingBlockIds,
    turnCount,
    moveTimerSetting: currentSettings.moveTimer || 0,
    selectedId,
    executeMoveRef,
    onGameOver: handleSpeedTimeout,
  });

  const initGame = useCallback((isDaily = isDailyChallengeMode) => {
    setPhase(PHASE_PLAYING);
    const msg = playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : playerMode === 3 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.';
    setMessage(msg);
    setBlocks(isDaily ? generateDailyTower(getThemeColors) : generateThemedTower());
    bumpRestartKey();
    resetRoundState();
    if (gameMode === 'speed') {
      startSpeedTimer(speedDuration);
    }
  }, [playerMode, isDailyChallengeMode, resetRoundState, gameMode, speedDuration, startSpeedTimer]);

  const handleStart = useCallback(() => {
    resumeAudio();
    trackGameStart('ui_button', playerMode);
    setIsDailyChallengeMode(false);
    if (showTutorial) {
      return;
    }
    initGame(false);
  }, [showTutorial, playerMode, initGame]);

  const handleStartDailyChallenge = useCallback(() => {
    resumeAudio();
    trackGameStart('daily_challenge', 1);
    setIsDailyChallengeMode(true);
    setShowDailyChallenge(false);
    setPlayerMode(1);
    initGame(true);
  }, [initGame]);

  const handleTutorialDone = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
    initGame(false);
  }, [initGame]);

  const handleBlockClick = useCallback((id) => {
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    if (playerMode === 3 && currentPlayer === 1) return;
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    if (block.layer >= topCompleteLayer) { setMessage('⚠ Нельзя брать из верхнего слоя!'); return; }
    if (selectedId === id) {
      setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.` : 'Выберите блок.');
      selectionTimeRef.current = null;
      setSelectedId(null);
    } else {
      playSelect();
      setMessage(`Блок ${id + 1}, слой ${block.layer + 1}`);
      selectionTimeRef.current = Date.now();
      setSelectedId(id);
    }
  }, [phase, simulatingBlockIds, blocks, topCompleteLayer, playerMode, currentPlayer, selectedId]);

  const executeMove = useCallback((targetSlot, block = null) => {
    const moveBlock = block || selectedBlock;
    if (!moveBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;

    playPull();

    // Сохраняем исходную позицию блока до обновления blocks
    const extractionPosition = [moveBlock.position[0], moveBlock.position[1], moveBlock.position[2]];
    setLastExtractionPosition(extractionPosition);

    const removedLayer = moveBlock.layer;

    let targetPosition, targetRotation, targetLayer;
    if (targetSlot) {
      targetPosition = targetSlot.position;
      targetRotation = targetSlot.rotation;
      targetLayer = targetSlot.newLayer;
    } else {
      // Fallback path (no UI slot, e.g. timer auto-move): drop into the
      // first available top-layer slot via the same domain logic.
      const slots = getDropSlots(blocks);
      const fallback = slots[0];
      targetPosition = fallback.position;
      targetRotation = fallback.rotation;
      targetLayer = fallback.newLayer;
    }

    const updatedBlocks = blocks.map((b) =>
      b.id === moveBlock.id
        ? { ...b, position: targetPosition, rotation: targetRotation, layer: targetLayer }
        : b
    );
    setBlocks(updatedBlocks);
    setSelectedId(null);
    setLastMovedBlockId(moveBlock.id);
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);
    latestTurnCountRef.current = newTurnCount;

    const selectionTimeMs = selectionTimeRef.current ? (Date.now() - selectionTimeRef.current) : null;
    const { newUnlocks } = recordMove(removedLayer, selectionTimeMs);
    selectionTimeRef.current = null;
    if (newUnlocks && newUnlocks.length > 0) {
      showAchievementNotification(newUnlocks);
    }

    replayMovesRef.current.push({
      blockId: moveBlock.id,
      fromLayer: removedLayer,
      fromPosition: [...moveBlock.position],
      toPosition: targetPosition,
      toLayer: targetLayer,
      timestamp: Date.now(),
    });

    const rawDynamicIds = getDifficultyDynamicIds(updatedBlocks, moveBlock, removedLayer);
    const dynamicIds = shouldOptimize
      ? capDynamicIdsForMobile(updatedBlocks, rawDynamicIds, moveBlock, removedLayer, maxDynamicBlocks)
      : rawDynamicIds;
    setSimulatingBlockIds(dynamicIds);
    setMessage('⏳ Стабилизация...');
  }, [selectedBlock, phase, simulatingBlockIds, blocks, turnCount, showAchievementNotification, shouldOptimize, maxDynamicBlocks]);

  executeMoveRef.current = executeMove;
  blocksRef.current = blocks;
  topCompleteLayerRef.current = topCompleteLayer;

  const handleMakeMove = useCallback(() => {
    if (!canMove || (playerMode === 3 && currentPlayer === 1)) return;
    executeMove(null);
  }, [canMove, executeMove, playerMode, currentPlayer]);

  const handleDropSlot = useCallback((slotData) => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    if (playerMode === 3 && currentPlayer === 1) return;
    executeMove(slotData);
  }, [selectedBlock, phase, simulatingBlockIds, executeMove, playerMode, currentPlayer]);

  const focusBlockById = useCallback((id) => {
    if (id === null || id === undefined) return;
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    setKeyboardFocusId(id);
    setMessage(`Блок ${id + 1}, слой ${block.layer + 1}`);
    setAnnouncement(`Блок ${id + 1}, слой ${block.layer + 1}`);
  }, [blocks]);

  const handleTouchFocusMove = useCallback((direction) => {
    if (!shouldOptimize) return;
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    if (playerMode === 3 && currentPlayer === 1) return;

    const selectableIds = getSelectableBlocks(blocks, topCompleteLayer);
    const currentFocusId = keyboardFocusId ?? selectedId;
    let nextId = null;

    if (direction === 'left' || direction === 'right') {
      nextId = cycleInLayer(blocks, selectableIds, currentFocusId, direction);
    } else {
      nextId = jumpToLayer(blocks, selectableIds, currentFocusId, direction);
    }

    focusBlockById(nextId);
  }, [shouldOptimize, phase, simulatingBlockIds, playerMode, currentPlayer, blocks, topCompleteLayer, keyboardFocusId, selectedId, focusBlockById]);

  const handleTouchLongPress = useCallback(() => {
    if (!shouldOptimize) return;
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    if (playerMode === 3 && currentPlayer === 1) return;

    const selectableIds = getSelectableBlocks(blocks, topCompleteLayer);
    const focusId = keyboardFocusId ?? selectedId ?? cycleBlock(selectableIds, null, 'next');
    if (focusId === null || focusId === undefined) return;

    if (selectedId !== focusId) {
      handleBlockClick(focusId);
      setKeyboardFocusId(focusId);
      setAnnouncement(`Блок ${focusId + 1} выбран`);
      return;
    }

    if (canMove) {
      handleMakeMove();
    }
  }, [shouldOptimize, phase, simulatingBlockIds, playerMode, currentPlayer, blocks, topCompleteLayer, keyboardFocusId, selectedId, handleBlockClick, canMove, handleMakeMove]);

  useTouchGestures(canvasRef, {
    onSwipeLeft: () => handleTouchFocusMove('left'),
    onSwipeRight: () => handleTouchFocusMove('right'),
    onSwipeUp: () => handleTouchFocusMove('up'),
    onSwipeDown: () => handleTouchFocusMove('down'),
    onLongPress: handleTouchLongPress,
  }, {
    enabled: shouldOptimize && phase === PHASE_PLAYING && !showPauseMenu && !showSettings && !showAchievements,
  });

  const handleRestart = useCallback(() => {
    playSelect();
    setShowPauseMenu(false);
    initGame();
  }, [initGame]);

  const { aiThinking, setAiThinking } = useAIPlayer({
    playerMode,
    currentPlayer,
    phase,
    simulatingBlockIds,
    blocksRef,
    topCompleteLayerRef,
    executeMoveRef,
    currentSettings,
    onSelectBlock: setSelectedId,
    onMessage: setMessage,
  });

  const handleBackToMenu = useCallback(() => {
    setShowPauseMenu(false);
    setShowSettings(false);
    setShowAchievements(false);
    setIsDailyChallengeMode(false);
    clearSpeedTimer();
    setGameMode('classic');
    setPhase(PHASE_START);
    setBlocks(generateThemedTower());
    bumpRestartKey();
    resetRoundState();
  }, [resetRoundState]);

  useKeyboardNavigation({
    phase,
    simulatingBlockIds,
    blocks,
    topCompleteLayer,
    keyboardFocusId,
    selectedId,
    canMove,
    playerMode,
    currentPlayer,
    showSettings,
    showAchievements,
    showPauseMenu,
    onBlockClick: handleBlockClick,
    onMakeMove: handleMakeMove,
    onRestart: handleRestart,
    onBackToMenu: handleBackToMenu,
    setKeyboardFocusId,
    setSelectedId,
    setMessage,
    setAnnouncement,
    setShowSettings,
    setShowAchievements,
    setShowPauseMenu,
    selectionTimeRef,
  });

  const handleContinueAfterCollapse = useCallback(() => {
    setBlocks(prevBlocks => prevBlocks.filter(b => !isCollapsedBlock(b)));
    setPhase(PHASE_PLAYING);
    setMessage('🔄 Продолжаем! Башня стабилизирована.');
    setContinuedAfterCollapse(true);
    setSimulatingBlockIds(null);
    trackRewardedVideoReward(true);
  }, []);

  const handleSimulationComplete = useCallback(async (updatedBlocks) => {
    let hasCollapsed = false;
    for (const b of updatedBlocks) {
      if (isCollapsedBlock(b)) {
        hasCollapsed = true;
        break;
      }
    }

    const cleanedBlocks = updatedBlocks.filter(b => b.position[1] >= FALLEN_Y);
    setBlocks(cleanedBlocks);
    setSimulatingBlockIds(null);

    const currentTurnCount = latestTurnCountRef.current;

    if (hasCollapsed) {
      playCollapse();
      setAiThinking(false);
      const t1 = setTimeout(() => playGameOver(), 300);
      achievementToastTimers.current.push(t1);
      recordGame(currentTurnCount, true);
      const best = getBestScore();
      const isNewRecord = currentTurnCount > best;
      trackGameOver(currentTurnCount, best, isNewRecord);

      const { newUnlocks } = recordCollapse(currentTurnCount);
      if (newUnlocks && newUnlocks.length > 0) {
        const t2 = setTimeout(() => showAchievementNotification(newUnlocks), 1500);
        achievementToastTimers.current.push(t2);
      }

      if (isDailyChallengeMode) {
        let maxLayer = 0;
        for (const b of updatedBlocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const currentHeight = maxLayer + 1;
        const challengeResult = await recordDailyChallengeAttempt(currentTurnCount, currentHeight, false);
        if (challengeResult.completed) {
          setAnnouncement('Челлендж дня выполнен! 🎉');
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

      setScreenShake(true);
      const shakeTimer = setTimeout(() => setScreenShake(false), 600);
      achievementToastTimers.current.push(shakeTimer);

      setPhase(PHASE_GAME_OVER);
    } else {
      playStabilize();
      const t3 = setTimeout(() => playPlace(), 150);
      achievementToastTimers.current.push(t3);

      // Сбрасываем consecutiveLosses и обновляем winStreak при успешной партии
      const { newUnlocks: successUnlocks } = recordSuccessfulMove(currentTurnCount);
      if (successUnlocks && successUnlocks.length > 0) {
        const t4 = setTimeout(() => showAchievementNotification(successUnlocks), 300);
        achievementToastTimers.current.push(t4);
      }

      if (isDailyChallengeMode) {
        let maxLayer = 0;
        for (const b of cleanedBlocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const currentHeight = maxLayer + 1;
        const challengeResult = await recordDailyChallengeAttempt(currentTurnCount, currentHeight, true);
        if (challengeResult.completed) {
          setAnnouncement('Челлендж дня выполнен! 🎉');
        }
      }

      if (playerMode === 2) {
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        setCurrentPlayer(nextPlayer);
        setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`);
      } else if (playerMode === 3) {
        setAiThinking(false);
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        setCurrentPlayer(nextPlayer);
        setMessage(nextPlayer === 1 ? '🤖 ИИ думает...' : `Ход: ${PLAYER_NAMES[0]}. Выберите блок.`);
      } else {
        setMessage('Выберите блок.');
      }
    }
  }, [playerMode, currentPlayer, showAchievementNotification, isDailyChallengeMode]);

  const handleSettingsChange = useCallback(() => {
    setCurrentSettings(getSettings());
    if (phase === PHASE_START) {
      setBlocks(generateThemedTower());
      bumpRestartKey();
    }
  }, [phase]);

  const handlePurchaseChange = useCallback(() => {
    setAdFree(isAdFree() || isRemoveAdsPurchased());
    setCurrentSettings(getSettings());
  }, []);

  return (
    <div className={`j-root${screenShake ? ' j-shake' : ''}`} ref={canvasRef} role="application" aria-label="Jenga 3D — 3D игра с физикой">
      {phase !== PHASE_START && (
        <Suspense fallback={<SceneLoadingFallback />}>
          <GameScene
            blocks={blocks}
            selectedId={selectedId}
            onBlockClick={handleBlockClick}
            simulatingBlockIds={simulatingBlockIds}
            onSimulationComplete={handleSimulationComplete}
            restartKey={restartKey}
            dropSlots={dropSlots}
            onDropSlot={handleDropSlot}
            lastMovedBlockId={lastMovedBlockId}
            lastExtractionPosition={lastExtractionPosition}
            blockTheme={currentSettings.theme}
            envTheme={currentSettings.environment}
            keyboardFocusId={keyboardFocusId}
            lowPowerMode={shouldOptimize}
            maxDynamicBlocks={maxDynamicBlocks}
          />
        </Suspense>
      )}
      {phase === PHASE_START && !showTutorial && !showSettings && !showAchievements && !showDailyChallenge && !showPurchase && (
        <StartScreen
          onStart={handleStart}
          playerMode={playerMode}
          setPlayerMode={setPlayerMode}
          gameMode={gameMode}
          setGameMode={setGameMode}
          speedDuration={speedDuration}
          setSpeedDuration={setSpeedDuration}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenDailyChallenge={() => setShowDailyChallenge(true)}
          onOpenPurchase={() => setShowPurchase(true)}
          showPurchaseButton={isPremiumStoreAvailable()}
        />
      )}
      {phase === PHASE_START && showTutorial && (
        <InteractiveTutorialOverlay onDone={handleTutorialDone} />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => {
            setShowSettings(false);
            if (phase === PHASE_PLAYING) setShowPauseMenu(true);
          }}
          onSettingsChange={handleSettingsChange}
        />
      )}
      {showAchievements && (
        <AchievementsPanel
          onClose={() => {
            setShowAchievements(false);
            if (phase === PHASE_PLAYING) setShowPauseMenu(true);
          }}
        />
      )}
      {phase === PHASE_PLAYING && !showPauseMenu && !showSettings && !showAchievements && (
        <UIPanel
          canMove={canMove}
          onMakeMove={handleMakeMove}
          onRestart={handleRestart}
          message={message}
          towerHeight={towerHeight}
          turnCount={turnCount}
          stabilizing={simulatingBlockIds !== null}
          currentPlayer={currentPlayer}
          playerMode={playerMode}
          aiThinking={aiThinking}
          onPauseMenu={() => setShowPauseMenu(true)}
          moveTimeLeft={moveTimeLeft}
          gameMode={gameMode}
          speedTimeLeft={speedTimeLeft}
        />
      )}
      {showPauseMenu && !showSettings && !showAchievements && (
        <PauseMenu
          turnCount={turnCount}
          towerHeight={towerHeight}
          currentPlayer={currentPlayer}
          playerMode={playerMode}
          onResume={() => setShowPauseMenu(false)}
          onOpenSettings={() => { setShowPauseMenu(false); setShowSettings(true); }}
          onOpenAchievements={() => { setShowPauseMenu(false); setShowAchievements(true); }}
          onRestart={handleRestart}
          onBackToMenu={handleBackToMenu}
        />
      )}
      {phase === PHASE_GAME_OVER && (
        <GameOverScreen
          turns={turnCount}
          onRestart={handleRestart}
          currentPlayer={currentPlayer}
          playerMode={playerMode}
          onContinueAfterCollapse={handleContinueAfterCollapse}
          continuedAfterCollapse={continuedAfterCollapse}
          gameMode={gameMode}
        />
      )}
      {achievementToast && (
        <AchievementToast
          achievement={achievementToast}
          onDismiss={() => setAchievementToast(null)}
        />
      )}
      {showDailyChallenge && (
        <DailyChallengePanel
          onStartChallenge={handleStartDailyChallenge}
          onClose={() => setShowDailyChallenge(false)}
        />
      )}
      {showPurchase && (
        <PurchasePanel
          onClose={() => setShowPurchase(false)}
          onPurchaseChange={handlePurchaseChange}
        />
      )}
      <AriaAnnouncer announcement={announcement} />
      <AdBanner visible={(phase === PHASE_START || phase === PHASE_GAME_OVER) && !adFree} />
    </div>
  );
}

export default App;
