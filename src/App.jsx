import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import GameScene from './GameScene';
import SocialSharePanel from './SocialSharePanel';
import QRCodeDisplay from './QRCodeDisplay';
import InteractiveTutorialOverlay from './InteractiveTutorialOverlay';
import { BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP } from './towerConfig';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, recordGame, resetAllScores } from './scoreTracker';
import { initializeAnalytics, trackGameStart, trackGameOver, trackShareClick, trackAdImpression } from './analyticsService';
import { recordMove, recordCollapse, ACHIEVEMENTS, getUnlockedAchievements, getLockedAchievements, getAchievementData } from './achievementsTracker';
import { getSettings, updateAllSettings, getDifficultyDynamicIds, getThemeColors } from './settingsTracker';
import { updateMasterVolume } from './soundEngine';

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

// ─── Tower generation with theme support ───
function generateThemedTower() {
  const colors = getThemeColors();
  const blocks = [];
  let id = 0;
  const TOWER_LAYERS = 18;
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

// ─── Styles ───
const baseStyles = {
  overlay: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    pointerEvents: 'none', fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif", zIndex: 10,
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

// ─── Achievement Toast ───
function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!achievement) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.9)', color: '#fff',
      padding: '14px 20px', borderRadius: 12,
      border: '1px solid rgba(42,110,255,0.4)',
      boxShadow: '0 4px 20px rgba(42,110,255,0.3)',
      backdropFilter: 'blur(12px)',
      animation: 'slideInRight 0.4s ease-out',
      maxWidth: 300, pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{achievement.emoji}</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#44ff88' }}>🏆 Достижение!</div>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>{achievement.title}</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{achievement.description}</div>
        </div>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', color: '#666', fontSize: 18,
          cursor: 'pointer', padding: '0 4px', marginLeft: 'auto',
        }}>✕</button>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Settings Panel ───
function SettingsPanel({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(() => getSettings());

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    updateAllSettings(updated);
    if (key === 'volume') updateMasterVolume();
    if (onSettingsChange) onSettingsChange(updated);
  };

  const handleReset = () => {
    const defaults = { volume: 70, moveTimer: 0, difficulty: 'normal', theme: 'classic' };
    setSettings(defaults);
    updateAllSettings(defaults);
    updateMasterVolume();
    if (onSettingsChange) onSettingsChange(defaults);
  };

  const timerOptions = [
    { label: 'Выкл', value: 0 },
    { label: '15 сек', value: 15 },
    { label: '30 сек', value: 30 },
    { label: '60 сек', value: 60 },
  ];

  const diffOptions = [
    { label: '🟢 Лёгкий', value: 'easy' },
    { label: '🟡 Обычный', value: 'normal' },
    { label: '🔴 Сложный', value: 'hard' },
  ];

  const themeOptions = [
    { label: '🪵 Классика', value: 'classic' },
    { label: '💜 Неон', value: 'neon' },
    { label: '🤍 Мрамор', value: 'marble' },
  ];

  const selectStyle = (isActive) => ({
    padding: '6px 12px', borderRadius: 6, border: 'none',
    background: isActive ? '#2a6eff' : 'rgba(255,255,255,0.08)',
    color: isActive ? '#fff' : '#aaa', fontSize: 13,
    cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
  });

  return (
    <div style={screenStyles.container}>
      <div style={{ ...screenStyles.card, maxWidth: 400, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>⚙️ Настройки</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Volume */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🔊 Громкость: {settings.volume}%</div>
          <input type="range" min="0" max="100" value={settings.volume}
            onChange={(e) => handleChange('volume', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2a6eff' }}
          />
        </div>

        {/* Timer */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>⏱️ Таймер хода</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {timerOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.moveTimer === opt.value)}
                onClick={() => handleChange('moveTimer', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>📐 Сложность</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {diffOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.difficulty === opt.value)}
                onClick={() => handleChange('difficulty', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🎨 Тема блоков</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {themeOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.theme === opt.value)}
                onClick={() => handleChange('theme', opt.value)}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={handleReset}>Сбросить</button>
          <button style={{ ...baseStyles.btn, fontSize: 13 }} onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}

// ─── Achievements Panel ───
function AchievementsPanel({ onClose }) {
  const unlocked = getUnlockedAchievements();
  const locked = getLockedAchievements();
  const total = ACHIEVEMENTS.length;
  const data = getAchievementData();

  return (
    <div style={screenStyles.container}>
      <div style={{ ...screenStyles.card, maxWidth: 420, textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>🏆 Достижения</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 14, color: '#2a6eff', fontWeight: 'bold', marginBottom: 16 }}>
          {unlocked.length}/{total} разблокировано
        </div>
        <div style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8,
        }}>
          {unlocked.map(a => (
            <div key={a.id} style={{
              background: 'rgba(42,110,255,0.1)', borderRadius: 10, padding: '10px 12px',
              border: '1px solid rgba(42,110,255,0.25)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{a.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{a.description}</div>
              {data.unlocked[a.id] && (
                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                  ✓ {new Date(data.unlocked[a.id].unlockedAt).toLocaleDateString('ru')}
                </div>
              )}
            </div>
          ))}
          {locked.map(a => (
            <div key={a.id} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4, filter: 'grayscale(1)' }}>🔒</div>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#888' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{a.description}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button style={baseStyles.btn} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}

// ─── Start Screen ───
function StartScreen({ onStart, playerMode, setPlayerMode, onOpenSettings, onOpenAchievements }) {
  const best = getBestScore();
  const total = getTotalGames();
  const unlockedCount = getUnlockedAchievements().length;
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
        <button style={{ ...baseStyles.btn, width: '100%', marginBottom: 12 }} onClick={onStart}>▶ Начать игру</button>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={onOpenSettings}>
            ⚙️ Настройки
          </button>
          <button style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={onOpenAchievements}>
            🏆 {unlockedCount}/{ACHIEVEMENTS.length}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Game Over Screen with sharing ───
function GameOverScreen({ turns, onRestart, currentPlayer, playerMode, achievementToast }) {
  const best = getBestScore();
  const total = getTotalGames();
  const loser = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : 'Вы';
  const [showQR, setShowQR] = useState(false);

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить! 🎮`;

  return (
    <div style={screenStyles.container}>
      <div style={{ ...screenStyles.card, maxWidth: showQR ? 420 : 380 }}>
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
        
        {showQR && (
          <div style={{ 
            background: 'rgba(255,255,255,0.05)', 
            padding: 12, 
            borderRadius: 8, 
            marginBottom: 12,
            textAlign: 'center',
            border: '1px solid rgba(42,110,255,0.3)'
          }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              📱 Отсканируй чтобы играть на телефоне
            </p>
            <QRCodeDisplay url="https://jenga3d.app" size={120} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <button style={baseStyles.btn} onClick={onRestart}>🔄 Играть снова</button>
          <button 
            style={{ ...baseStyles.btnSecondary, color: '#2a6eff' }}
            onClick={() => setShowQR(!showQR)}
          >
            {showQR ? '✓ QR' : '📱 QR'}
          </button>
        </div>
        
        {/* Social sharing */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 8, textAlign: 'center' }}>
            Поделись своим результатом! 📱
          </p>
          <SocialSharePanel 
            shareText={shareText}
            shareTitle="Jenga 3D"
            shareUrl="https://jenga3d.app"
          />
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
          {canMove && <div style={{ fontSize: 12, color: '#88ff88', marginTop: 6 }}>💡 Нажми на зелёный слот или кнопку ниже</div>}
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
  const [blocks, setBlocks] = useState(() => generateThemedTower());
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [turnCount, setTurnCount] = useState(0);
  const [simulatingBlockIds, setSimulatingBlockIds] = useState(null);
  const [restartKey, setRestartKey] = useState(0);
  const [showTutorial, setShowTutorial] = useState(!hasSeenTutorial());
  const [playerMode, setPlayerMode] = useState(1); // 1 or 2 players
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 or 1
  const [lastMovedBlockId, setLastMovedBlockId] = useState(null); // для particle effects
  const [achievementToast, setAchievementToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const selectionTimeRef = useRef(null); // tracks when block was selected for speed achievement

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

  // ─── Drop slots: available placement positions on top of tower ───
  const dropSlots = useMemo(() => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return null;
    const maxLayer = blocks.reduce((m, b) => Math.max(m, b.layer), 0);
    const topLayerBlocks = blocks.filter((b) => b.layer === maxLayer);
    const slots = [];

    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
      // New empty layer — all 3 slots available
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
      // Incomplete top layer — remaining slots available
      const y = maxLayer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
      const isOdd = maxLayer % 2 === 1;
      const rot = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
      const occupiedSlots = topLayerBlocks.map((b) => {
        // Determine slot index from position
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

  // Resume audio context on first user interaction
  useEffect(() => {
    // Initialize Analytics
    initializeAnalytics();
    
    const handler = () => { resumeAudio(); };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  // ─── Show achievement toast (queue: one at a time) ───
  const showAchievementNotification = useCallback((newUnlocks) => {
    if (newUnlocks && newUnlocks.length > 0) {
      // Show first unlock, queue rest
      let idx = 0;
      const showNext = () => {
        if (idx < newUnlocks.length) {
          setAchievementToast(newUnlocks[idx]);
          idx++;
          setTimeout(() => {
            setAchievementToast(null);
            setTimeout(showNext, 300);
          }, 3500);
        }
      };
      showNext();
    }
  }, []);

  const initGame = useCallback(() => {
    setPhase(PHASE_PLAYING);
    setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.');
    setBlocks(generateThemedTower());
    setSelectedId(null);
    setTurnCount(0);
    setCurrentPlayer(0);
    setSimulatingBlockIds(null);
    setLastMovedBlockId(null);
    setRestartKey((k) => k + 1);
    selectionTimeRef.current = null;
  }, [playerMode]);

  const handleStart = useCallback(() => {
    resumeAudio();
    trackGameStart('ui_button', playerMode);
    if (showTutorial) {
      // Tutorial will show first, then transition to playing
      return;
    }
    initGame();
  }, [showTutorial, playerMode, initGame]);

  const handleTutorialDone = useCallback(() => {
    markTutorialSeen();
    setShowTutorial(false);
    initGame();
  }, [initGame]);

  const handleBlockClick = useCallback((id) => {
    if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
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

  // ─── Unified move execution (replaces duplicated handleMakeMove + handleDropSlot) ───
  const executeMove = useCallback((targetSlot) => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;

    playPull();

    const removedLayer = selectedBlock.layer;
    
    // Determine target position
    let targetPosition, targetRotation, targetLayer;
    if (targetSlot) {
      // Drop slot click — use slot data
      targetPosition = targetSlot.position;
      targetRotation = targetSlot.rotation;
      targetLayer = targetSlot.newLayer;
    } else {
      // Button click — auto-place in first available slot
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
      b.id === selectedBlock.id
        ? { ...b, position: targetPosition, rotation: targetRotation, layer: targetLayer }
        : b
    );
    setBlocks(updatedBlocks);
    setSelectedId(null);
    setLastMovedBlockId(selectedBlock.id);
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    // ─── Record achievement stats ───
    const selectionTimeMs = selectionTimeRef.current ? (Date.now() - selectionTimeRef.current) : null;
    const { newUnlocks } = recordMove(removedLayer, selectionTimeMs);
    selectionTimeRef.current = null;
    if (newUnlocks && newUnlocks.length > 0) {
      showAchievementNotification(newUnlocks);
    }

    // ─── Use difficulty-based dynamic IDs ───
    const dynamicIds = getDifficultyDynamicIds(updatedBlocks, selectedBlock, removedLayer);
    setSimulatingBlockIds(dynamicIds);
    setMessage('⏳ Стабилизация...');
  }, [selectedBlock, phase, simulatingBlockIds, blocks, turnCount, showAchievementNotification]);

  const handleMakeMove = useCallback(() => {
    if (!canMove) return;
    executeMove(null);
  }, [canMove, executeMove]);

  const handleDropSlot = useCallback((slotData) => {
    if (!selectedBlock || phase !== PHASE_PLAYING || simulatingBlockIds !== null) return;
    executeMove(slotData);
  }, [selectedBlock, phase, simulatingBlockIds, executeMove]);

  const handleRestart = useCallback(() => {
    playSelect();
    initGame();
  }, [initGame]);

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
      const best = getBestScore();
      const isNewRecord = turnCount >= best;
      trackGameOver(turnCount, best, isNewRecord);

      // ─── Record collapse for achievements ───
      const { newUnlocks } = recordCollapse(turnCount);
      if (newUnlocks && newUnlocks.length > 0) {
        setTimeout(() => showAchievementNotification(newUnlocks), 1500);
      }

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
  }, [turnCount, playerMode, currentPlayer, showAchievementNotification]);

  const handleSettingsChange = useCallback(() => {
    // Theme might have changed — regenerate tower if on start screen
    if (phase === PHASE_START) {
      setBlocks(generateThemedTower());
      setRestartKey((k) => k + 1);
    }
  }, [phase]);

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
        dropSlots={dropSlots}
        onDropSlot={handleDropSlot}
        lastMovedBlockId={lastMovedBlockId}
      />
      {phase === PHASE_START && !showTutorial && !showSettings && !showAchievements && (
        <StartScreen
          onStart={handleStart}
          playerMode={playerMode}
          setPlayerMode={setPlayerMode}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAchievements={() => setShowAchievements(true)}
        />
      )}
      {phase === PHASE_START && showTutorial && (
        <InteractiveTutorialOverlay onDone={handleTutorialDone} />
      )}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSettingsChange={handleSettingsChange}
        />
      )}
      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
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
      {achievementToast && (
        <AchievementToast
          achievement={achievementToast}
          onDismiss={() => setAchievementToast(null)}
        />
      )}
    </div>
  );
}

export default App;
