import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import GameScene from './GameScene';
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
import { BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP, TOWER_LAYERS } from './towerConfig';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, playAchievementUnlock, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, recordGame } from './scoreTracker';
import { initializeAnalytics, trackGameStart, trackGameOver, trackRewardedVideoReward } from './analyticsService';
import { initAdSDK, isAdFree } from './adService';
import { recordMove, recordCollapse, recordSuccessfulMove } from './achievementsTracker';
import { getSettings, getDifficultyDynamicIds, getThemeColors } from './settingsTracker';
import { handleKeyEvent } from './keyboardController';
import DailyChallengePanel from './DailyChallengePanel';
import { generateDailyTower, recordDailyChallengeAttempt } from './dailyChallengeTracker';
import PurchasePanel from './PurchasePanel';
import { isRemoveAdsPurchased } from './purchaseService';
import { computeAIDropSlot, AI_THINK_DELAY, AI_MOVE_DELAY } from './aiController';
import { chooseAIBlockAdvanced, aiPersonality } from './aiControllerAdvanced';
import { useTouchGestures } from './touchGestureController';
import { useMobileOptimizations } from './mobileOptimizations';

const PHASE_START = 'start';
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';
const FALLEN_Y = -0.5;
const COLLAPSE_DROP_THRESHOLD = (BLOCK_H + LAYER_GAP) * 3;

const TUTORIAL_KEY = 'jenga3d_tutorial_done';
function hasSeenTutorial() { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {} }

function isCollapsedBlock(block) {
  if (block.position[1] < FALLEN_Y) return true;
  if (block.layer < 0) return false;

  const expectedY = block.layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
  const hasDroppedFromLayer = block.position[1] < expectedY - COLLAPSE_DROP_THRESHOLD;

  return hasDroppedFromLayer;
}

function generateThemedTower() {
  const colors = getThemeColors();
  const blocks = [];
  let id = 0;
  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = layer % 2 === 1;
    const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const offset = -STEP + b * STEP;
      blocks.push({
        id,
        position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
        rotation: rot,
        color: colors[id % colors.length],
        layer,
      });
      id++;
    }
  }
  return blocks;
}

function App() {
  const [phase, setPhase] = useState(PHASE_START);
  const [blocks, setBlocks] = useState(() => generateThemedTower());
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [simulatingBlockIds, setSimulatingBlockIds] = useState(null);
  const [restartKey, setRestartKey] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!hasSeenTutorial());
  const [playerMode, setPlayerMode] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [lastMovedBlockId, setLastMovedBlockId] = useState(null);
  const [achievementToast, setAchievementToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [keyboardFocusId, setKeyboardFocusId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [continuedAfterCollapse, setContinuedAfterCollapse] = useState(false);
  const [adFree, setAdFree] = useState(() => isAdFree() || isRemoveAdsPurchased());
  const [aiThinking, setAiThinking] = useState(false);
  const [lastExtractionPosition, setLastExtractionPosition] = useState(null);
  const selectionTimeRef = useRef(null);
  const achievementToastTimers = useRef([]);
  const latestTurnCountRef = useRef(0);
  const aiTimersRef = useRef([]);
  const executeMoveRef = useRef(null);
  const blocksRef = useRef(null);
  const topCompleteLayerRef = useRef(null);
  const canvasRef = useRef(null);
  const { deviceInfo, shouldOptimize } = useMobileOptimizations();
  const [currentSettings, setCurrentSettings] = useState(() => getSettings());
  useTouchGestures(canvasRef, {
    onSwipeLeft: () => console.log('Swipe left detected'),
    onSwipeRight: () => console.log('Swipe right detected'),
    onSwipeUp: () => console.log('Swipe up detected'),
    onSwipeDown: () => console.log('Swipe down detected'),
    onPinch: (scale) => console.log('Pinch detected, scale:', scale),
    onLongPress: () => console.log('Long press detected'),
  });

  const towerHeight = useMemo(() => {
    let maxLayer = 0;
    for (const b of blocks) if (b.layer > maxLayer) maxLayer = b.layer;
    return maxLayer + 1;
  }, [blocks]);

  const topCompleteLayer = useMemo(() => {
    const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
    return blocks.filter((b) => b.layer === maxLayer).length >= BLOCKS_PER_LAYER ? maxLayer : maxLayer - 1;
  }, [blocks]);

  const selectedBlock = useMemo(() => blocks.find((b) => b.id === selectedId) || null, [blocks, selectedId]);
  const canMove = selectedBlock !== null && phase === PHASE_PLAYING && simulatingBlockIds === null && selectedBlock.layer < topCompleteLayer;

  const dropSlots = useMemo(() => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return null;
    const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
    const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);
    const slots = [];

    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
      const newLayer = maxLayer + 1;
      const y = newLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
      const isOdd = newLayer % 2 === 1;
      const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
      for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
        const offset = -STEP + s * STEP;
        slots.push({
          slotIndex: s,
          isOdd,
          position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
          rotation: rot,
          newLayer,
        });
      }
    } else {
      const y = maxLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
      const isOdd = maxLayer % 2 === 1;
      const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
      const occupiedSlots = topLayerBlocks.map((b) => {
        const val = isOdd ? b.position[0] : b.position[2];
        return Math.round((val + STEP) / STEP);
      });
      for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
        if (!occupiedSlots.includes(s)) {
          const offset = -STEP + s * STEP;
          slots.push({
            slotIndex: s,
            isOdd,
            position: [isOdd ? offset : 0, y, isOdd ? 0 : offset],
            rotation: rot,
            newLayer: maxLayer,
          });
        }
      }
    }
    return slots;
  }, [selectedBlock, phase, simulatingBlockIds, blocks]);

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

  const initGame = useCallback((isDaily = isDailyChallengeMode) => {
    setPhase(PHASE_PLAYING);
    const msg = playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : playerMode === 3 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.';
    setMessage(msg);
    setBlocks(isDaily ? generateDailyTower(getThemeColors, BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP) : generateThemedTower());
    setSelectedId(null);
    setTurnCount(0);
    latestTurnCountRef.current = 0;
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setLastMovedBlockId(null);
    setContinuedAfterCollapse(false);
    setRestartKey((k) => k + 1);
    selectionTimeRef.current = null;
    setAiThinking(false);
    setLastExtractionPosition(null);
    achievementToastTimers.current.forEach(id => clearTimeout(id));
    achievementToastTimers.current = [];
    aiTimersRef.current.forEach(id => clearTimeout(id));
    aiTimersRef.current = [];
  }, [playerMode, isDailyChallengeMode]);

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
    setSelectedId((prev) => {
      if (prev === id) {
        setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.` : 'Выберите блок.');
        selectionTimeRef.current = null;
        return null;
      } else {
        playSelect();
        setMessage(`Блок ${id + 1}, слой ${block.layer + 1}`);
        selectionTimeRef.current = Date.now();
        return id;
      }
    });
  }, [phase, simulatingBlockIds, blocks, topCompleteLayer, playerMode, currentPlayer]);

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
      const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
      const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);
      let slotIndex = topLayerBlocks.length;
      targetLayer = maxLayer;
      if (topLayerBlocks.length >= BLOCKS_PER_LAYER) { targetLayer = maxLayer + 1; slotIndex = 0; }
      const y = targetLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
      const isOdd = targetLayer % 2 === 1;
      const offset = -STEP + slotIndex * STEP;
      targetPosition = [isOdd ? offset : 0, y, isOdd ? 0 : offset];
      targetRotation = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
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

    const dynamicIds = getDifficultyDynamicIds(updatedBlocks, moveBlock, removedLayer);
    setSimulatingBlockIds(dynamicIds);
    setMessage('⏳ Стабилизация...');
  }, [selectedBlock, phase, simulatingBlockIds, blocks, turnCount, showAchievementNotification]);

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

  const handleRestart = useCallback(() => {
    playSelect();
    setShowPauseMenu(false);
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (playerMode !== 3 || currentPlayer !== 1 || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    if (aiThinking) return;

    setAiThinking(true);
    setMessage('🤖 ИИ думает...');

    const t1 = setTimeout(() => {
      const currentBlocks = blocksRef.current;
      const currentTopLayer = topCompleteLayerRef.current;
      const difficulty = currentSettings.difficulty || 'normal';
      const aiBlock = chooseAIBlockAdvanced(currentBlocks, currentTopLayer, aiPersonality, difficulty);
      if (!aiBlock) {
        setAiThinking(false);
        setMessage('🤖 ИИ не может найти блок!');
        return;
      }
      const dropSlot = computeAIDropSlot(currentBlocks, aiBlock);
      setSelectedId(aiBlock.id);
      setMessage(`🤖 ИИ выбрал блок ${aiBlock.id + 1}, слой ${aiBlock.layer + 1}`);

      const t2 = setTimeout(() => {
        executeMoveRef.current(dropSlot, aiBlock);
      }, AI_MOVE_DELAY);
      aiTimersRef.current.push(t2);

      // Safety timeout: if simulation doesn't complete in 8 seconds, force reset AI thinking
      const safetyTimeout = setTimeout(() => {
        setAiThinking(false);
      }, 8000);
      aiTimersRef.current.push(safetyTimeout);
    }, AI_THINK_DELAY);
    aiTimersRef.current.push(t1);

    return () => {
      aiTimersRef.current.forEach(id => clearTimeout(id));
      aiTimersRef.current = [];
    };
  }, [playerMode, currentPlayer, phase, simulatingBlockIds]); // aiThinking excluded: setting it inside triggers cleanup

  useEffect(() => {
    const onKeyDown = (e) => {
      if (showSettings) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSettings(false);
          if (phase === PHASE_PLAYING) setShowPauseMenu(true);
        }
        return;
      }
      if (showAchievements) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowAchievements(false);
          if (phase === PHASE_PLAYING) setShowPauseMenu(true);
        }
        return;
      }
      if (showPauseMenu) {
        return;
      }

      if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) {
        if ((e.key === 'Escape' || e.key === 'm' || e.key === 'М') && phase === PHASE_PLAYING) {
          e.preventDefault();
          setShowPauseMenu(true);
        }
        return;
      }

      const result = handleKeyEvent(e, blocks, topCompleteLayer, keyboardFocusId, selectedId, canMove);
      if (!result) return;

      switch (result.action) {
        case 'focus':
          setKeyboardFocusId(result.focusId);
          const focusBlock = blocks.find(b => b.id === result.focusId);
          if (focusBlock) setAnnouncement(`Блок ${result.focusId + 1}, слой ${focusBlock.layer + 1}`);
          break;
        case 'select':
          setKeyboardFocusId(result.focusId);
          handleBlockClick(result.focusId);
          setAnnouncement(`Блок ${result.focusId + 1} выбран`);
          break;
        case 'move':
          handleMakeMove();
          break;
        case 'deselect':
          setSelectedId(null);
          setKeyboardFocusId(null);
          setMessage(playerMode === 2 || playerMode === 3 ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.` : 'Выберите блок.');
          setAnnouncement('Блок отменён');
          selectionTimeRef.current = null;
          break;
        case 'pause':
          setShowPauseMenu(true);
          break;
        case 'restart':
          handleRestart();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, simulatingBlockIds, blocks, topCompleteLayer, keyboardFocusId, selectedId, canMove, playerMode, currentPlayer, handleBlockClick, handleMakeMove, handleRestart, showSettings, showAchievements, showPauseMenu]);

  const handleBackToMenu = useCallback(() => {
    setShowPauseMenu(false);
    setShowSettings(false);
    setShowAchievements(false);
    setIsDailyChallengeMode(false);
    setContinuedAfterCollapse(false);
    setPhase(PHASE_START);
    setBlocks(generateThemedTower());
    setSelectedId(null);
    setTurnCount(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
    setAiThinking(false);
    setLastExtractionPosition(null);
    aiTimersRef.current.forEach(id => clearTimeout(id));
    aiTimersRef.current = [];
  }, []);

  const handleContinueAfterCollapse = useCallback(() => {
    setBlocks(prevBlocks => prevBlocks.map(b => {
      if (isCollapsedBlock(b)) {
        return { ...b, position: [b.position[0], 0.01, b.position[2]], layer: -1 };
      }
      return b;
    }));
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
      setRestartKey((k) => k + 1);
    }
  }, [phase]);

  const handlePurchaseChange = useCallback(() => {
    setAdFree(isAdFree() || isRemoveAdsPurchased());
    setCurrentSettings(getSettings());
  }, []);

  return (
    <div className="j-root" ref={canvasRef} role="application" aria-label="Jenga 3D — 3D игра с физикой">
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
      />
      {phase === PHASE_START && !showTutorial && !showSettings && !showAchievements && !showDailyChallenge && !showPurchase && (
        <StartScreen
          onStart={handleStart}
          playerMode={playerMode}
          setPlayerMode={setPlayerMode}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAchievements={() => setShowAchievements(true)}
          onOpenDailyChallenge={() => setShowDailyChallenge(true)}
          onOpenPurchase={() => setShowPurchase(true)}
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
