import React, { useState, useEffect, useCallback } from 'react';
import {
  getDailyChallenge,
  isDailyChallengeCompleted,
  getDailyChallengeResult,
  getDailyLeaderboard,
  subscribeOnlineLeaderboardToday,
  getPlayerName,
  setPlayerName,
} from './dailyChallengeTracker';
import { isFirebaseEnabled } from './firebaseService';

export default function DailyChallengePanel({ onStartChallenge, onClose }) {
  const challenge = getDailyChallenge();
  const completed = isDailyChallengeCompleted();
  const result = getDailyChallengeResult();
  const localLeaderboard = getDailyLeaderboard();
  const firebaseOn = isFirebaseEnabled();

  const [tab, setTab] = useState(firebaseOn ? 'global' : 'local');
  const [onlineEntries, setOnlineEntries] = useState([]);
  const [loading, setLoading] = useState(firebaseOn);
  const [playerName, setLocalPlayerName] = useState(() => getPlayerName());

  useEffect(() => {
    if (!firebaseOn) {
      setOnlineEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeOnlineLeaderboardToday((entries) => {
      setOnlineEntries(entries);
      setLoading(false);
    });

    return unsubscribe;
  }, [firebaseOn]);

  const handleNameChange = useCallback((e) => {
    setLocalPlayerName(e.target.value);
    setPlayerName(e.target.value);
  }, []);

  const currentEntries = tab === 'global' ? onlineEntries : localLeaderboard;

  const renderLeaderboard = () => {
    if (tab === 'global' && loading) {
      return <div className="j-lb-loading">Загрузка глобального рейтинга...</div>;
    }

    if (currentEntries.length === 0) {
      return (
        <div className="j-lb-empty">
          {tab === 'global' ? 'Глобальный рейтинг пока пуст. Будь первым!' : 'Пока нет результатов. Начни челлендж!'}
        </div>
      );
    }

    return currentEntries.map((entry, i) => (
      <div key={entry.id || i} className="j-lb-row">
        <span className="j-lb-rank">
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
        </span>
        <span className="j-lb-name">{entry.name}</span>
        <span className="j-lb-score">{entry.turns} ходов</span>
        {entry.towerHeight && <span className="j-lb-height">{entry.towerHeight} сл.</span>}
      </div>
    ));
  };

  return (
    <div className="j-overlay" role="dialog" aria-label="Ежедневный челлендж">
      <div className="j-card j-card--wide">
        <h2 className="j-heading">📅 Челлендж дня</h2>

        <div className="j-challenge-title">{challenge.title}</div>
        <div className="j-challenge-desc">{challenge.description}</div>

        {completed && (
          <div className="j-challenge-badge">✅ Выполнено!</div>
        )}

        {result && (
          <div className="j-challenge-attempts">
            Попыток: {result.attempts} · Лучший результат: {result.bestTurns} ходов
          </div>
        )}

        {/* Name input for online leaderboard */}
        {firebaseOn && (
          <div className="j-name-input">
            <span className="j-name-input__icon">👤</span>
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="Ваше имя для рейтинга"
              maxLength={20}
              className="j-name-field"
              aria-label="Имя для рейтинга"
            />
          </div>
        )}

        {/* Leaderboard */}
        <div className="j-lb-section">
          <div className="j-lb-title">
            🏆 Рейтинг сегодня
            {firebaseOn && <span className="j-lb-badge j-lb-badge--online">🌐 Online</span>}
            {!firebaseOn && <span className="j-lb-badge j-lb-badge--offline">📱 Local</span>}
          </div>

          {firebaseOn && (
            <div className="j-lb-tabs">
              <button
                className={`j-lb-tab ${tab === 'global' ? 'j-lb-tab--active' : 'j-lb-tab--inactive'}`}
                onClick={() => setTab('global')}
              >
                🌐 Глобальный
              </button>
              <button
                className={`j-lb-tab ${tab === 'local' ? 'j-lb-tab--active' : 'j-lb-tab--inactive'}`}
                onClick={() => setTab('local')}
              >
                📱 Мои результаты
              </button>
            </div>
          )}

          {renderLeaderboard()}
        </div>

        <div className="j-flex-actions">
          <button
            aria-label="Начать челлендж"
            className="j-btn j-btn--primary"
            onClick={onStartChallenge}
          >
            ▶ Начать челлендж
          </button>
          <button
            aria-label="Закрыть"
            className="j-btn j-btn--secondary"
            onClick={onClose}
          >
            ✕ Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}