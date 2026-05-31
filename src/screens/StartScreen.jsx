import React from 'react';
import { getBestScore, getTotalGames } from '../scoreTracker';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../achievementsTracker';
import { isDailyChallengeCompleted } from '../dailyChallengeTracker';

export default function StartScreen({ onStart, playerMode, setPlayerMode, gameMode, setGameMode, speedDuration, setSpeedDuration, onOpenSettings, onOpenAchievements, onOpenDailyChallenge, onOpenPurchase, showPurchaseButton = true }) {
  const best = getBestScore();
  const total = getTotalGames();
  const unlockedCount = getUnlockedAchievements().length;
  const dailyDone = isDailyChallengeCompleted();
  return (
    <div className="j-overlay j-overlay--start" role="dialog" aria-label="Стартовый экран">
      <div className="j-card">
        <h1 className="j-heading j-heading--gradient">🧱 Jenga 3D</h1>
        <p className="j-subtext">
          Вытаскивай блоки, ставь наверх.<br/>
          Не урони башню!
        </p>
        {total > 0 && (
          <div className="j-stats j-stagger-1">
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
        <div className="j-mode-group" style={{ marginBottom: 8 }}>
          <button
            className={`j-mode-btn j-mode-btn--solo${gameMode === 'classic' ? ' is-active' : ''}`}
            onClick={() => setGameMode('classic')}
          >
            🎯 Классика
          </button>
          <button
            className={`j-mode-btn j-mode-btn--ai${gameMode === 'speed' ? ' is-active' : ''}`}
            onClick={() => setGameMode('speed')}
          >
            ⚡ Speed Run
          </button>
        </div>
        {gameMode === 'speed' && (
          <div className="j-opt-group" style={{ justifyContent: 'center', marginBottom: 14 }}>
            {[60, 120, 180].map(d => (
              <button key={d} className={`j-opt-btn${speedDuration === d ? ' is-active' : ''}`}
                onClick={() => setSpeedDuration(d)}>
                {d}с
              </button>
            ))}
          </div>
        )}
        <div className="j-mode-group j-stagger-2">
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
        <button className="j-btn j-btn--primary j-btn--full j-mb-14 j-stagger-3" aria-label="Начать игру" onClick={onStart}>▶ Начать игру</button>
        <div className="j-actions-row j-stagger-4">
          <button className="j-action-btn" aria-label="Настройки" onClick={onOpenSettings}>
            ⚙️ Настройки
          </button>
          <button className="j-action-btn" aria-label="Достижения" onClick={onOpenAchievements}>
            🏆 {unlockedCount}/{ACHIEVEMENTS.length}
          </button>
          <button className={`j-action-btn ${dailyDone ? 'j-action-btn--green' : 'j-action-btn--yellow'}`} aria-label="Ежедневный челлендж" onClick={onOpenDailyChallenge}>
            📅 Челлендж
          </button>
          {showPurchaseButton && (
            <button className="j-action-btn j-action-btn--blue" aria-label="Премиум магазин" onClick={onOpenPurchase}>
              💎 Премиум
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
