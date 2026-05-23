import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import GameScene from './GameScene';
import SocialSharePanel from './SocialSharePanel';
import QRCodeDisplay from './QRCodeDisplay';
import InteractiveTutorialOverlay from './InteractiveTutorialOverlay';
import AriaAnnouncer from './AriaAnnouncer';
import AdBanner from './AdBanner';
import RewardedVideoButton from './RewardedVideoButton';
import { PauseMenu } from './PauseMenu';
import { BLOCK_H, LAYER_GAP, BLOCKS_PER_LAYER, STEP } from './towerConfig';
import { playSelect, playPull, playPlace, playCollapse, playStabilize, playGameOver, resumeAudio } from './soundEngine';
import { getBestScore, getTotalGames, recordGame } from './scoreTracker';
import { initializeAnalytics, trackGameStart, trackGameOver, trackRewardedVideoReward } from './analyticsService';
import { initAdSDK, isAdFree } from './adService';
import { recordMove, recordCollapse, ACHIEVEMENTS, getUnlockedAchievements, getLockedAchievements, getAchievementData } from './achievementsTracker';
import { getSettings, updateAllSettings, getDifficultyDynamicIds, getThemeColors } from './settingsTracker';
import { clearTextureCache } from './blockTextures';
import { updateMasterVolume } from './soundEngine';
import { handleKeyEvent } from './keyboardController';
import DailyChallengePanel from './DailyChallengePanel';
import { generateDailyTower, recordDailyChallengeAttempt, isDailyChallengeCompleted } from './dailyChallengeTracker';
import PurchasePanel from './PurchasePanel';
import { isPurchased, isRemoveAdsPurchased, getAvailableSkins, getAvailableEnvThemes } from './purchaseService';

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
    <div role="alert" aria-live="assertive" style={{
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
        <button onClick={onDismiss} aria-label="Закрыть уведомление" style={{
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
    const defaults = { volume: 70, moveTimer: 0, difficulty: 'normal', theme: 'classic', environment: 'classic' };
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
    { label: '🧊 Лёд', value: 'ice' },
    { label: '🎋 Бамбук', value: 'bamboo' },
    { label: '🍬 Конфеты', value: 'candy' },
  ];

  const envOptions = [
    { label: '🪵 Классика', value: 'classic' },
    { label: '🌌 Космос', value: 'space' },
    { label: '🏖️ Пляж', value: 'beach' },
    { label: '📚 Библиотека', value: 'library' },
  ];

  const selectStyle = (isActive) => ({
    padding: '6px 12px', borderRadius: 6, border: 'none',
    background: isActive ? '#2a6eff' : 'rgba(255,255,255,0.08)',
    color: isActive ? '#fff' : '#aaa', fontSize: 13,
    cursor: 'pointer', fontWeight: isActive ? 'bold' : 'normal',
    transition: 'all 0.2s',
  });

  return (
    <div style={screenStyles.container} role="dialog" aria-label="Настройки">
      <div style={{ ...screenStyles.card, maxWidth: 400, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>⚙️ Настройки</h2>
          <button onClick={onClose} aria-label="Закрыть настройки" style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Volume */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🔊 Громкость: {settings.volume}%</div>
          <input type="range" min="0" max="100" value={settings.volume}
            onChange={(e) => handleChange('volume', Number(e.target.value))}
            style={{ width: '100%', accentColor: '#2a6eff' }}
            aria-label="Громкость"
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🎨 Тема блоков</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {themeOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.theme === opt.value)}
                onClick={() => { handleChange('theme', opt.value); clearTextureCache(); }}>{opt.label}</button>
            ))}
          </div>
        </div>

        {/* Environment */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>🌍 Окружение</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {envOptions.map(opt => (
              <button key={opt.value} style={selectStyle(settings.environment === opt.value)}
                onClick={() => handleChange('environment', opt.value)}>{opt.label}</button>
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
    <div style={screenStyles.container} role="dialog" aria-label="Достижения">
      <div style={{ ...screenStyles.card, maxWidth: 420, textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>🏆 Достижения</h2>
          <button onClick={onClose} aria-label="Закрыть достижения" style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
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
function StartScreen({ onStart, playerMode, setPlayerMode, onOpenSettings, onOpenAchievements, onOpenDailyChallenge, onOpenPurchase }) {
  const best = getBestScore();
  const total = getTotalGames();
  const unlockedCount = getUnlockedAchievements().length;
  return (
    <div style={screenStyles.container} role="dialog" aria-label="Стартовый экран">
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
            aria-label="1 игрок"
            aria-pressed={playerMode === 1}
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
            aria-label="2 игрока"
            aria-pressed={playerMode === 2}
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
        <button aria-label="Начать игру" style={{ ...baseStyles.btn, width: '100%', marginBottom: 12 }} onClick={onStart}>▶ Начать игру</button>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button aria-label="Настройки" style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={onOpenSettings}>
            ⚙️ Настройки
          </button>
          <button aria-label="Достижения" style={{ ...baseStyles.btnSecondary, fontSize: 13 }} onClick={onOpenAchievements}>
            🏆 {unlockedCount}/{ACHIEVEMENTS.length}
          </button>
          <button aria-label="Ежедневный челлендж" style={{ ...baseStyles.btnSecondary, fontSize: 13, borderColor: isDailyChallengeCompleted() ? 'rgba(68,255,136,0.4)' : 'rgba(255,204,0,0.4)', color: isDailyChallengeCompleted() ? '#44ff88' : '#ffcc00' }} onClick={onOpenDailyChallenge}>
            📅 Челлендж
          </button>
          <button aria-label="Премиум магазин" style={{ ...baseStyles.btnSecondary, fontSize: 13, borderColor: 'rgba(42,110,255,0.4)', color: '#2a6eff' }} onClick={onOpenPurchase}>
            💎 Премиум
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Game Over Screen with sharing ───
function GameOverScreen({ turns, onRestart, currentPlayer, playerMode, achievementToast, onContinueAfterCollapse, continuedAfterCollapse }) {
  const best = getBestScore();
  const total = getTotalGames();
  const loser = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : 'Вы';
  const [showQR, setShowQR] = useState(false);

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить! 🎮`;

  return (
    <div style={screenStyles.container} role="dialog" aria-label="Конец игры">
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
          <button aria-label="Играть снова" style={baseStyles.btn} onClick={onRestart}>🔄 Играть снова</button>
          {!continuedAfterCollapse && onContinueAfterCollapse && (
            <RewardedVideoButton
              onRewardGranted={onContinueAfterCollapse}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                fontSize: 14, cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
              }}
            />
          )}
          <button
            aria-label="Показать QR код"
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
function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing, currentPlayer, playerMode, onPauseMenu }) {
  const playerColor = playerMode === 2 ? PLAYER_COLORS[currentPlayer] : '#fff';
  const playerName = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : '';
  return (
    <div style={baseStyles.overlay} role="status" aria-label="Игровая панель">
      <div style={baseStyles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={baseStyles.title}>🧱 Jenga</h2>
          <button onClick={onPauseMenu} aria-label="Открыть меню паузы" style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: '#fff', fontSize: 20, cursor: 'pointer',
            padding: '4px 10px', lineHeight: 1, transition: 'background 0.2s',
          }} title="Меню">☰</button>
        </div>
        {playerMode === 2 && (
          <div style={{ fontSize: 13, color: playerColor, fontWeight: 'bold', marginBottom: 4 }}>
            ▸ Ход: {playerName}
          </div>
        )}
        {stabilizing && <div style={{ color: '#88aaff', fontSize: 13, marginBottom: 6 }}>⏳ Стабилизация...</div>}
        <div style={baseStyles.info} aria-live="polite">
          {message && <div style={baseStyles.message}>{message}</div>}
          <div>Слой: {towerHeight} · Ходов: {turnCount}</div>
          {canMove && <div style={{ fontSize: 12, color: '#88ff88', marginTop: 6 }}>💡 Нажми на зелёный слот или кнопку ниже</div>}
        </div>
        <div style={baseStyles.buttons}>
          <button aria-label="Сделать ход" style={{ ...baseStyles.btn, opacity: canMove ? 1 : 0.4 }} disabled={!canMove} onClick={onMakeMove}>
            Сделать ход
          </button>
          <button aria-label="Начать заново" style={baseStyles.btnSecondary} onClick={onRestart}>↻</button>
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
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [isDailyChallengeMode, setIsDailyChallengeMode] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [keyboardFocusId, setKeyboardFocusId] = useState(null); // keyboard accessibility focus
  const [announcement, setAnnouncement] = useState(''); // screen reader announcements
  const [continuedAfterCollapse, setContinuedAfterCollapse] = useState(false); // ad continuation flag
  const [adFree, setAdFree] = useState(() => isAdFree() || isRemoveAdsPurchased());
  const selectionTimeRef = useRef(null); // tracks when block was selected for speed achievement
  const achievementToastTimers = useRef([]); // track setTimeout IDs for achievement toast chain
  const latestTurnCountRef = useRef(0); // track latest turnCount for simulation callback
  const [currentSettings, setCurrentSettings] = useState(() => getSettings()); // memoized settings

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
    // Initialize Ad SDK
    initAdSDK();
    
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
      // Clear any existing toast chain
      achievementToastTimers.current.forEach(id => clearTimeout(id));
      achievementToastTimers.current = [];
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
    setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[0]}. Выберите блок.` : 'Выберите блок.');
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
    // Clear any pending achievement toasts
    achievementToastTimers.current.forEach(id => clearTimeout(id));
    achievementToastTimers.current = [];
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
    latestTurnCountRef.current = newTurnCount;

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
    setShowPauseMenu(false);
    initGame();
  }, [initGame]);

  // ─── Keyboard accessibility ───
  useEffect(() => {
    const onKeyDown = (e) => {
      // ─── Overlay priority: Settings > Achievements > PauseMenu ───
      // When an overlay is open, handle Escape for that overlay and ignore game keys
      if (showSettings) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSettings(false);
          // Return to PauseMenu if we were in a game
          if (phase === PHASE_PLAYING) setShowPauseMenu(true);
        }
        return; // Don't process game keys while overlay is open
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
        // PauseMenu handles its own Escape (resume / cancel confirm)
        // Just ignore all game keys while paused
        return;
      }

      if (phase !== PHASE_PLAYING || simulatingBlockIds !== null) {
        // Only handle Escape/M for pause menu outside of playing
        if (e.key === 'Escape' || e.key === 'm' || e.key === 'М') {
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
          setMessage(playerMode === 2 ? `Ход: ${PLAYER_NAMES[currentPlayer]}. Выберите блок.` : 'Выберите блок.');
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
  }, []);

  // ─── Continue after collapse (rewarded video reward) ───
  const handleContinueAfterCollapse = useCallback(() => {
    // Freeze fallen blocks — snap them to ground level so tower stays as-is
    // Use functional updater to avoid stale closure over blocks
    setBlocks(prevBlocks => prevBlocks.map(b => {
      if (b.position[1] < -0.5) {
        return { ...b, position: [b.position[0], 0.01, b.position[2]], layer: -1 };
      }
      return b;
    }));
    setPhase(PHASE_PLAYING);
    setMessage('🔄 Продолжаем! Башня стабилизирована.');
    setContinuedAfterCollapse(true);
    setSimulatingBlockIds(null);
    trackRewardedVideoReward(true); // ad_free_continuation = true
  }, []);

  const handleSimulationComplete = useCallback(async (updatedBlocks) => {
    let anyFallen = false;
    for (const b of updatedBlocks) {
      if (b.position[1] < -0.5) {
        anyFallen = true;
        break;
      }
    }

    setBlocks(updatedBlocks);
    setSimulatingBlockIds(null);

    // Use ref for latest turnCount to avoid stale closure
    const currentTurnCount = latestTurnCountRef.current;

    if (anyFallen) {
      playCollapse();
      const t1 = setTimeout(() => playGameOver(), 300);
      achievementToastTimers.current.push(t1);
      recordGame(currentTurnCount, true);
      const best = getBestScore();
      const isNewRecord = currentTurnCount > best;
      trackGameOver(currentTurnCount, best, isNewRecord);

      // ─── Record collapse for achievements ───
      const { newUnlocks } = recordCollapse(currentTurnCount);
      if (newUnlocks && newUnlocks.length > 0) {
        const t2 = setTimeout(() => showAchievementNotification(newUnlocks), 1500);
        achievementToastTimers.current.push(t2);
      }

      // ─── Record daily challenge attempt (if in challenge mode) ───
      if (isDailyChallengeMode) {
        // Calculate current tower height from updatedBlocks
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

      // ─── Record daily challenge progress on successful move (survived) ───
      if (isDailyChallengeMode) {
        let maxLayer = 0;
        for (const b of updatedBlocks) if (b.layer > maxLayer) maxLayer = b.layer;
        const currentHeight = maxLayer + 1;
        const challengeResult = await recordDailyChallengeAttempt(currentTurnCount, currentHeight, true);
        if (challengeResult.completed) {
          setAnnouncement('Челлендж дня выполнен! 🎉');
        }
      }

      // Switch player in 2-player mode
      if (playerMode === 2) {
        const nextPlayer = currentPlayer === 0 ? 1 : 0;
        setCurrentPlayer(nextPlayer);
        setMessage(`Ход: ${PLAYER_NAMES[nextPlayer]}. Выберите блок.`);
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

  // ─── Render ───
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }} role="application" aria-label="Jenga 3D — 3D игра с физикой">
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
            // Return to PauseMenu if we were in a game
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
      {/* Ad banners — only on Start and GameOver screens, not during gameplay */}
      <AdBanner visible={(phase === PHASE_START || phase === PHASE_GAME_OVER) && !adFree} />
    </div>
  );
}

export default App;
