import React from 'react';
import { getBestScore, getTotalGames } from '../scoreTracker';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../achievementsTracker';
import { isDailyChallengeCompleted } from '../dailyChallengeTracker';

export default function StartScreen({ onStart, playerMode, setPlayerMode, onOpenSettings, onOpenAchievements, onOpenDailyChallenge, onOpenPurchase }) {
  const best = getBestScore();
  const total = getTotalGames();
  const unlockedCount = getUnlockedAchievements().length;
  const dailyDone = isDailyChallengeCompleted();
  return (
    <div className="j-overlay" role="dialog" aria-label="Стартовый экран">
      <div className="j-card">
        <h1 className="j-heading">🧱 Jenga 3D</h1>
        <p className="j-subtext">
          Вытаскивай блоки, ставь наверх.<br/>
          Не урони башню!
        </p>
        {total > 0 && (
          <div className="j-stats">
            <div className="j-stat">
              <div className="j-stat__val">{best}</div>
              <div className="j-stat__label">Лучший результат</div>
            </div>
            <div className="j-stat">
              <div className="j-stat__val">{total}</div>
              <div className="j-stat__label">Игр сыграно</div>
            </div>
          </div>
        )}
        <div className="j-mode-group">
          <button
            aria-label="1 игрок"
            aria-pressed={playerMode === 1}
            className={`j-mode-btn j-mode-btn--solo${playerMode === 1 ? ' is-active' : ''}`}
            onClick={() => setPlayerMode(1)}
          >
            🎯 1 игрок
          </button>
          <button
            aria-label="2 игрока"
            aria-pressed={playerMode === 2}
            className={`j-mode-btn j-mode-btn--duo${playerMode === 2 ? ' is-active' : ''}`}
            onClick={() => setPlayerMode(2)}
          >
            👥 2 игрока
          </button>
          <button
            aria-label="Против ИИ"
            aria-pressed={playerMode === 3}
            className={`j-mode-btn j-mode-btn--ai${playerMode === 3 ? ' is-active' : ''}`}
            onClick={() => setPlayerMode(3)}
          >
            🤖 vs ИИ
          </button>
        </div>
        <button className="j-btn j-btn--primary j-btn--full j-mb-14" aria-label="Начать игру" onClick={onStart}>▶ Начать игру</button>
        <div className="j-actions-row">
          <button className="j-action-btn" aria-label="Настройки" onClick={onOpenSettings}>
            ⚙️ Настройки
          </button>
          <button className="j-action-btn" aria-label="Достижения" onClick={onOpenAchievements}>
            🏆 {unlockedCount}/{ACHIEVEMENTS.length}
          </button>
          <button className={`j-action-btn ${dailyDone ? 'j-action-btn--green' : 'j-action-btn--yellow'}`} aria-label="Ежедневный челлендж" onClick={onOpenDailyChallenge}>
            📅 Челлендж
          </button>
          <button className="j-action-btn j-action-btn--blue" aria-label="Премиум магазин" onClick={onOpenPurchase}>
            💎 Премиум
          </button>
        </div>
      </div>
    </div>
  );
}