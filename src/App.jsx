import React, { useState, useCallback, useMemo, useEffect } from 'react';
import GameScene from './GameScene';
import { generateTower, BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP } from './towerConfig';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, recordGame, resetAllScores } from './scoreTracker';

// ─── Game phases ───
const PHASE_START = 'start';
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

// ─── Tutorial tracking ───
const TUTORIAL_KEY = 'jenga3d_tutorial_done';
function hasSeenTutorial() { try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; } }
function markTutorialSeen() { try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {} }

// ─── Player colors ───
const PLAYER_COLORS = ['#2a6eff', '#ff4444'];
const PLAYER_NAMES = ['Игрок 1', 'Игрок 2'];

// ─── Styles ───
const baseStyles = {
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', fontFamily: "'Segoe UI', Arial, sans-serif", zIndex: 10,
  },
  panel: {
    position: 'absolute', top: 12, left: 12,
    background: 'rgba(0, 0, 0, 0.75)', color: '#fff',
    padding: '12px 16px', borderRadius: 12,
    backdropFilter: 'blur(8px)', textAlign: 'left', pointerEvents: 'auto',
    minWidth: 160, border: '1px solid rgba(255,255,255,0.08)',
  },
  title: { margin: '0 0 8px', fontSize: 20, fontWeight: 'bold' },
  info: { fontSize: 14, marginBottom: 10, lineHeight: 1.6 },
  message: { color: '#ffcc00', marginBottom: 4, fontSize: 14 },
  buttons: { display: 'flex', gap: 8, justifyContent: 'flex-start' },
  btn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold',
  },
};

const screenStyles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 20,
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '32px 40px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 380, border: '1px solid rgba(255,255,255,0.1)',
  },
  heading: { margin: '0 0 12px', fontSize: 28, fontWeight: 'bold' },
  subtext: { fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.5 },
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2a6eff' },
  statLabel: { fontSize: 12, color: '#888' },
};

// ─── Tutorial Overlay ───
const TUTORIAL_STEPS = [
  { emoji: '👆', title: 'Выбери блок', text: 'Кликни на любой блок ниже верхнего слоя.' },
  { emoji: '⬆️', title: 'Сделай ход', text: 'Нажми «Сделать ход» — блок перенесётся наверх.' },
  { emoji: '🧱', title: 'Не урони!', text: 'Если башня рухнет — ты проиграл. Удачи!' },
];

function TutorialOverlay({ onDone }) {
  const [step, setStep] = useState(0);
  const s = TUTORIAL_STEPS[step];
  return (
    <div style={screenStyles.container}>
      <div style={screenStyles.card}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{s.emoji}</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 'bold' }}>{s.title}</h2>
        <p style={screenStyles.subtext}>{s.text}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {step < TUTORIAL_STEPS.length - 1 ? (
            <button style={baseStyles.btn} onClick={() => setStep(step + 1)}>Далее →</button>
          ) : (
            <button style={baseStyles.btn} onClick={onDone}>Понятно! ▶</button>
          )}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              background: i <= step ? '#2a6eff' : '#444',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Start Screen ───
function StartScreen({ onStart, playerMode, setPlayerMode }) {
  const best = getBestScore();
  const total = getTotalGames();
  return (
    <div style={screenStyles.container}>
      <div style={screenStyles.card}>
        <h1 style={screenStyles.heading}>🧱 Jenga 3D</h1>
        <p style={screenStyles.subtext}>
          Вытаскивай блоки, ставь наверх.<br/>
          Не урони башню!
        </p>
        {total > 0 && (
          <div style={screenStyles.statRow}>
            <div style={screenStyles.statItem}>
              <div style={screenStyles.statValue}>{best}</div>
              <div style={screenStyles.statLabel}>Лучший результат</div>
            </div>
            <div style={screenStyles.statItem}>
              <div style={screenStyles.statValue}>{total}</div>
              <div style={screenStyles.statLabel}>Игр сыграно</div>
            </div>
          </div>
        )}
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          <button
            style={{
              ...baseStyles.btn,
              background: playerMode === 1 ? '#2a6eff' : 'rgba(42,110,255,0.15)',
              border: playerMode === 1 ? 'none' : '1px solid #2a6eff',
              color: playerMode === 1 ? '#fff' : '#2a6eff',
            }}
            onClick={() => setPlayerMode(1)}
          >
            🎯 1 игрок
          </button>
          <button
            style={{
              ...baseStyles.btn,
              background: playerMode === 2 ? '#ff4444' : 'rgba(255,68,68,0.15)',
              border: playerMode === 2 ? 'none' : '1px solid #ff4444',
              color: playerMode === 2 ? '#fff' : '#ff4444',
            }}
            onClick={() => setPlayerMode(2)}
          >
            👥 2 игрока
          </button>
        </div>
        <button style={baseStyles.btn} onClick={onStart}>▶ Начать игру</button>
      </div>
    </div>
  );
}

// ─── Game Over Screen with sharing ───
function GameOverScreen({ turns, onRestart, currentPlayer, playerMode }) {
  const best = getBestScore();
  const total = getTotalGames();
  const loser = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : 'Вы';

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить!`;

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://jenga3d.app')}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div style={screenStyles.container}>
      <div style={screenStyles.card}>
        <h1 style={{ ...screenStyles.heading, color: '#ff4444' }}>💥 Башня рухнула!</h1>
        {playerMode === 2 && (
          <p style={{ fontSize: 16, color: PLAYER_COLORS[currentPlayer], marginBottom: 12, fontWeight: 'bold' }}>
            {loser} проиграл!
          </p>
        )}
        <div style={screenStyles.statRow}>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{turns}</div>
            <div style={screenStyles.statLabel}>Ходов сделано</div>
          </div>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{best}</div>
            <div style={screenStyles.statLabel}>Лучший результат</div>
          </div>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{total}</div>
            <div style={screenStyles.statLabel}>Игр сыграно</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
          <button style={baseStyles.btn} onClick={onRestart}>🔄 Играть снова</button>
        </div>
        {/* Social sharing */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={shareTwitter} style={{
            ...baseStyles.btnSecondary, padding: '6px 12px', fontSize: 12,
            border: '1px solid #1da1f2', color: '#1da1f2',
          }}>🐦 Twitter</button>
          <button onClick={shareTelegram} style={{
            ...baseStyles.btnSecondary, padding: '6px 12px', fontSize: 12,
            border: '1px solid #0088cc', color: '#0088cc',
          }}>✈️ Telegram</button>
        </div>
      </div>
    </div>
  );
}

// ─── Playing UI Panel ───
function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing, currentPlayer, playerMode }) {
  const playerColor = playerMode === 2 ? PLAYER_COLORS[currentPlayer] : '#fff';
  const playerName = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : '';
  return (
    <div style={baseStyles.overlay}>
      <div style={baseStyles.panel}>
        <h2 style={baseStyles.title}>🧱 Jenga</h2>
        {playerMode === 2 && (
          <div style={{ fontSize: 13, color: playerColor, fontWeight: 'bold', marginBottom: 4 }}>
            ▸ Ход: {playerName}
          </div>
        )}
        {stabilizing && <div style={{ color: '#88aaff', fontSize: 13, marginBottom: 6 }}>⏳ Стабилизация...</div>}
        <div style={baseStyles.info}>
          {message && <div style={baseStyles.message}>{message}</div>}
          <div>Слой: {towerHeight} · Ходов: {turnCount}</div>
        </div>
        <div style={baseStyles.buttons}>
          <button style={{ ...baseStyles.btn, opacity: canMove ? 1 : 0.4 }} disabled={!canMove} onClick={onMakeMove}>
            Сделать ход
          </button>
          <button style={baseStyles.btnSecondary} onClick={onRestart}>↻</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───
function App() {
  const [phase, setPhase] = useState(PHASE_START);
  const [blocks, setBlocks] = useState(() => generateTower());
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [simulatingBlockIds, setSimulatingBlockIds] = useState(null);
  const [restartKey, setRestartKey] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!hasSeenTutorial());
  const [playerMode, setPlayerMode] = useState(1); // 1 or 2 players
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 or 1

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

  // Resume audio context on first user interaction
  useEffect(() => {
    const handler = () => { resumeAudio(); };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  const handleStart = useCallback(() => {
    resumeAudio();
    if (showTutorial) {
      // Tutorial will show first, then transition to playing
      return;
    }
    setPhase(PHASE_PLAYING);
    setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.');
    setBlocks(generateTower());
    setSelectedId(null);
    setTurnCount(0);
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
  }, [showTutorial, playerMode]);

  const handleTutorialDone = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
    setPhase(PHASE_PLAYING);
    setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.');
    setBlocks(generateTower());
    setSelectedId(null);
    setTurnCount(0);
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
  }, [playerMode]);

  const handleBlockClick = useCallback((id) => {
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    if (block.layer >= topCompleteLayer) { setMessage('⚠ Нельзя брать из верхнего слоя!'); return; }
    setSelectedId((prev) => {
      if (prev === id) {
        setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.` : 'Выберите блок.');
        return null;
      } else {
        playSelect();
        setMessage(`Блок ${id + 1}, слой ${block.layer + 1}`);
        return id;
      }
    });
  }, [phase, simulatingBlockIds, blocks, topCompleteLayer, playerMode, currentPlayer]);

  const handleMakeMove = useCallback(() => {
    if (!canMove || !selectedBlock) return;

    playPull();

    const removedLayer = selectedBlock.layer;
    const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
    const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);
    let newLayer = maxLayer;
    let slotIndex = topLayerBlocks.length;
    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) { newLayer = maxLayer + 1; slotIndex = 0; }
    const y = newLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = newLayer % 2 === 1;
    const offset = -STEP + slotIndex * STEP;
    const newX = isOdd ? offset : 0;
    const newZ = isOdd ? 0 : offset;
    const newRot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];

    const updatedBlocks = blocks.map((b) =>
      b.id === selectedBlock.id
        ? { ...b, position: [newX, y, newZ], rotation: newRot, layer: newLayer }
        : b
    );
    setBlocks(updatedBlocks);
    setSelectedId(null);
    setTurnCount((c) => c + 1);

    const dynamicIds = new Set();
    for (const b of updatedBlocks) {
      if (b.id === selectedBlock.id || b.layer >= removedLayer) {
        dynamicIds.add(b.id);
      }
    }
    setSimulatingBlockIds(dynamicIds);
    setMessage('⏳ Стабилизация...');
  }, [canMove, selectedBlock, blocks]);

  const handleRestart = useCallback(() => {
    playSelect();
    setPhase(PHASE_PLAYING);
    setBlocks(generateTower());
    setSelectedId(null);
    setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.');
    setTurnCount(0);
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
  }, [playerMode]);

  const handleSimulationComplete = useCallback((updatedBlocks) => {
    let anyFallen = false;
    for (const b of updatedBlocks) {
      if (b.position[1] < -0.5) {
        anyFallen = true;
        break;
      }
    }

    setBlocks(updatedBlocks);
    setSimulatingBlockIds(null);

    if (anyFallen) {
      playCollapse();
      setTimeout(() => playGameOver(), 300);
      recordGame(turnCount, true);
      setPhase(PHASE_GAME_OVER);
    } else {
      playStabilize();
      setTimeout(() => playPlace(), 150);
      // Switch player in 2-player mode
      if (playerMode === 2) {
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        setCurrentPlayer(nextPlayer);
        setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`);
      } else {
        setMessage('Выберите блок.');
      }
    }
  }, [turnCount, playerMode, currentPlayer]);

  // ─── Render ───
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <GameScene
        blocks={blocks}
        selectedId={selectedId}
        onBlockClick={handleBlockClick}
        simulatingBlockIds={simulatingBlockIds}
        onSimulationComplete={handleSimulationComplete}
        restartKey={restartKey}
      />
      {phase === PHASE_START && !showTutorial && (
        <StartScreen onStart={handleStart} playerMode={playerMode} setPlayerMode={setPlayerMode} />
      )}
      {phase === PHASE_START && showTutorial && (
        <TutorialOverlay onDone={handleTutorialDone} />
      )}
      {phase === PHASE_PLAYING && (
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
        />
      )}
      {phase === PHASE_GAME_OVER && (
        <GameOverScreen turns={turnCount} onRestart={handleRestart} currentPlayer={currentPlayer} playerMode={playerMode} />
      )}
    </div>
  );
}

export default App;
