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
import { capDynamicIdsForMobile } from './domain/dynamicBlocks';
import { playSelect, playPull, playGameOver, resumeAudio, cancelPendingSounds } from './soundEngine';
import { recordGame } from './scoreTracker';
import { initializeAnalytics, trackGameStart, trackRewardedVideoReward } from './analyticsService';
import { initAdSDK, isAdFree } from './adService';
import { recordMove } from './achievementsTracker';
import { getSettings, getDifficultyDynamicIds, getThemeColors } from './settingsTracker';
import { cycleBlock, cycleInLayer, getSelectableBlocks, jumpToLayer } from './keyboardController';
import DailyChallengePanel from './DailyChallengePanel';
import { generateDailyTower } from './dailyChallengeTracker';
import PurchasePanel from './PurchasePanel';
import { isPremiumStoreAvailable, isRemoveAdsPurchased } from './purchaseService';
import { useTouchGestures } from './touchGestureController';
import { useMobileOptimizations } from './mobileOptimizations';
import { generateGameId, getChallengeFromUrl } from './shareService';
import useAIPlayer from './hooks/useAIPlayer';
import useKeyboardNavigation from './hooks/useKeyboardNavigation';
import useTimers from './hooks/useTimers';
import useGameReducer, * as gameActions from './hooks/useGameReducer';
import { useDispatchers } from './hooks/useDispatchers';
import useAchievementToasts from './hooks/useAchievementToasts';
import useGameSimulation, { continueAfterCollapseUpdate } from './hooks/useGameSimulation';

const GameScene = lazy(() => import('./GameScene'));

const PHASE_START = 'start';
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

const TUTORIAL_KEY = 'jenga3d_tutorial_done';
function hasSeenTutorial() { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {} }

function SceneLoadingFallback() {
  return (
    <div className="j-loading-overlay" role="status" aria-label="Загрузка сцены">
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
    aiThinking,
  } = state;

  const {
    setPhase, setBlocks, setSelectedId, setMessage, setTurnCount, setSimulatingBlockIds,
    bumpRestartKey, setShowTutorial, setPlayerMode, setCurrentPlayer, setLastMovedBlockId,
    setAchievementToast, setShowSettings, setShowAchievements, setShowPauseMenu,
    setShowDailyChallenge, setIsDailyChallengeMode, setShowPurchase, setKeyboardFocusId,
    setAnnouncement, setContinuedAfterCollapse, setAdFree, setScreenShake,
    setLastExtractionPosition, setGameMode, setSpeedDuration, setAiThinking,
  } = useDispatchers(dispatch, state);

  // Lazy initial value for adFree (the reducer defaults to false; sync the real value on mount)
  useEffect(() => {
    if (isAdFree() || isRemoveAdsPurchased()) dispatch(gameActions.setAdFree(true));
  }, []);

  const selectionTimeRef = useRef(null);
  const latestTurnCountRef = useRef(0);
  const executeMoveRef = useRef(null);
  const blocksRef = useRef(null);
  const topCompleteLayerRef = useRef(null);
  const canvasRef = useRef(null);
  const replayMovesRef = useRef([]);
  const gameIdRef = useRef(generateGameId());
  const { shouldOptimize, renderSettings, deviceLevel, maxDynamicBlocks } = useMobileOptimizations();
  const [currentSettings, setCurrentSettings] = useState(() => getSettings());

  // Achievement toast queue lives in its own hook. timersRef is also used by
  // handleSimulationComplete to schedule delayed game-over sound and screen
  // shake — both share the same cancellation lifecycle.
  const { showAchievementNotification, clearToasts, timersRef: achievementToastTimers } =
    useAchievementToasts(dispatch);

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
    clearToasts();
    cancelPendingSounds();
  }, [clearToasts]);

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
      if (slots.length === 0) return;
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

  useAIPlayer({
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
    aiThinking,
    onAiThinkingChange: setAiThinking,
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
    setBlocks((prevBlocks) => continueAfterCollapseUpdate(prevBlocks));
    setPhase(PHASE_PLAYING);
    setMessage('🔄 Продолжаем! Башня стабилизирована.');
    setContinuedAfterCollapse(true);
    setSimulatingBlockIds(null);
    trackRewardedVideoReward(true);
  }, []);

  const { handleSimulationComplete } = useGameSimulation({
    dispatch,
    playerMode,
    currentPlayer,
    isDailyChallengeMode,
    setAiThinking,
    showAchievementNotification,
    timersRef: achievementToastTimers,
    latestTurnCountRef,
    replayMovesRef,
    gameIdRef,
  });

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
