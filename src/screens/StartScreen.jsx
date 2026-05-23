import React from 'react';
import { screenStyles, baseStyles, PLAYER_COLORS, PLAYER_NAMES } from '../styles';
import { getBestScore, getTotalGames } from '../scoreTracker';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../achievementsTracker';
import { isDailyChallengeCompleted } from '../dailyChallengeTracker';

export default function StartScreen({ onStart, playerMode, setPlayerMode, onOpenSettings, onOpenAchievements, onOpenDailyChallenge, onOpenPurchase }) {
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