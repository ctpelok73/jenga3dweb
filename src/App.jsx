import React, { useState, useCallback, useMemo, useEffect } from 'react';
import GameScene from './GameScene';
import { generateTower, BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP } from './towerConfig';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, recordGame, resetAllScores } from './scoreTracker';

// ─── Game phases ───
const PHASE_START = 'start';
const PHASE_PLAYING = 'playing';
const PHASE_GAME_OVER = 'gameOver';

// ─── Responsive CSS-in-JS ───
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
  gameOverText: { color: '#ff4444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
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

// ─── Full-screen overlay screens ───
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
    maxWidth: 360, border: '1px solid rgba(255,255,255,0.1)',
  },
  heading: { margin: '0 0 12px', fontSize: 28, fontWeight: 'bold' },
  subtext: { fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.5 },
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#2a6eff' },
  statLabel: { fontSize: 12, color: '#888' },
};

function StartScreen({ onStart }) {
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
        <button style={baseStyles.btn} onClick={onStart}>▶ Начать игру</button>
      </div>
    </div>
  );
}

function GameOverScreen({ turns, onRestart }) {
  const best = getBestScore();
  const total = getTotalGames();
  return (
    <div style={screenStyles.container}>
      <div style={screenStyles.card}>
        <h1 style={{ ...screenStyles.heading, color: '#ff4444' }}>💥 Башня рухнула!</h1>
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
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={baseStyles.btn} onClick={onRestart}>🔄 Играть снова</button>
        </div>
      </div>
    </div>
  );
}

function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing }) {
  return (
    <div style={baseStyles.overlay}>
      <div style={baseStyles.panel}>
        <h2 style={baseStyles.title}>🧱 Jenga</h2>
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

function App() {
  const [phase, setPhase] = useState(PHASE_START);
  const [blocks, setBlocks] = useState(() => generateTower());
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [simulatingBlockIds, setSimulatingBlockIds] = useState(null);
  const [restartKey, setRestartKey] = useState(0);

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
    setPhase(PHASE_PLAYING);
    setMessage('Выберите блок.');
    setBlocks(generateTower());
    setSelectedId(null);
    setTurnCount(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
  }, []);

  const handleBlockClick = useCallback((id) => {
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    const block = blocks.find((b) => b.id === id);
    if (!block) return;
    if (block.layer >= topCompleteLayer) { setMessage('⚠ Нельзя брать из верхнего слоя!'); return; }
    setSelectedId((prev) => {
      if (prev === id) {
        setMessage('Выберите блок.');
        return null;
      } else {
        playSelect();
        setMessage(`Блок ${id + 1}, слой ${block.layer + 1}`);
        return id;
      }
    });
  }, [phase, simulatingBlockIds, blocks, topCompleteLayer]);

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
    setMessage('Выберите блок.');
    setTurnCount(0);
    setSimulatingBlockIds(null);
    setRestartKey((k) => k + 1);
  }, []);

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
      // Record game result
      recordGame(turnCount, true);
      setPhase(PHASE_GAME_OVER);
    } else {
      playStabilize();
      setTimeout(() => playPlace(), 150);
      setMessage('Выберите блок.');
    }
  }, [turnCount]);

  // ─── Render based on phase ───
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
      {phase === PHASE_START && <StartScreen onStart={handleStart} />}
      {phase === PHASE_PLAYING && (
        <UIPanel
          canMove={canMove}
          onMakeMove={handleMakeMove}
          onRestart={handleRestart}
          message={message}
          towerHeight={towerHeight}
          turnCount={turnCount}
          stabilizing={simulatingBlockIds !== null}
        />
      )}
      {phase === PHASE_GAME_OVER && <GameOverScreen turns={turnCount} onRestart={handleRestart} />}
    </div>
  );
}

export default App;
