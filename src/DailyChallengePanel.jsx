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

const panelStyles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 20,
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '28px 36px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 420, width: '90%',
    border: '1px solid rgba(42,110,255,0.15)',
  },
  heading: { margin: '0 0 12px', fontSize: 24, fontWeight: 'bold' },
  challengeTitle: { fontSize: 18, fontWeight: 'bold', color: '#44ff88', marginBottom: 8 },
  challengeDesc: { fontSize: 14, color: '#aaa', marginBottom: 16, lineHeight: 1.5 },
  completedBadge: {
    display: 'inline-block', padding: '6px 16px', borderRadius: 8,
    background: 'rgba(68,255,136,0.15)', color: '#44ff88',
    fontSize: 14, fontWeight: 'bold', marginBottom: 12,
    border: '1px solid rgba(68,255,136,0.3)',
  },
  attemptsInfo: { fontSize: 13, color: '#888', marginBottom: 16 },
  nameInput: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
  },
  nameField: {
    padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14,
    width: '100%', outline: 'none',
  },
  leaderboardSection: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 16, marginBottom: 16,
  },
  leaderboardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#2a6eff' },
  tabGroup: {
    display: 'flex', gap: 6, marginBottom: 12,
  },
  tab: {
    padding: '6px 14px', borderRadius: 8, border: 'none',
    fontSize: 13, cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
  },
  tabActive: {
    background: '#2a6eff', color: '#fff',
  },
  tabInactive: {
    background: 'rgba(255,255,255,0.08)', color: '#888',
  },
  leaderboardRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '4px 8px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  leaderboardRank: { color: '#ffcc00', fontWeight: 'bold', minWidth: 24 },
  leaderboardName: { flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  leaderboardScore: { fontWeight: 'bold', color: '#2a6eff' },
  leaderboardHeight: { fontSize: 11, color: '#888', marginLeft: 8 },
  emptyLeaderboard: { fontSize: 13, color: '#666', textAlign: 'center', padding: 8 },
  loadingText: { fontSize: 13, color: '#888', textAlign: 'center', padding: 8 },
  onlineBadge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    background: 'rgba(42,110,255,0.15)', color: '#2a6eff',
    fontSize: 11, fontWeight: 'bold', marginLeft: 6,
  },
  offlineBadge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 4,
    background: 'rgba(255,204,0,0.15)', color: '#ffcc00',
    fontSize: 11, fontWeight: 'bold', marginLeft: 6,
  },
  buttonGroup: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnPrimary: {
    padding: '12px 20px', borderRadius: 10, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 15,
    cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '10px 20px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
  },
};

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
      return <div style={panelStyles.loadingText}>Загрузка глобального рейтинга...</div>;
    }

    if (currentEntries.length === 0) {
      return (
        <div style={panelStyles.emptyLeaderboard}>
          {tab === 'global' ? 'Глобальный рейтинг пока пуст. Будь первым!' : 'Пока нет результатов. Начни челлендж!'}
        </div>
      );
    }

    return currentEntries.map((entry, i) => (
      <div key={entry.id || i} style={panelStyles.leaderboardRow}>
        <span style={panelStyles.leaderboardRank}>
          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
        </span>
        <span style={panelStyles.leaderboardName}>{entry.name}</span>
        <span style={panelStyles.leaderboardScore}>{entry.turns} ходов</span>
        {entry.towerHeight && <span style={panelStyles.leaderboardHeight}>{entry.towerHeight} сл.</span>}
      </div>
    ));
  };

  return (
    <div style={panelStyles.container} role="dialog" aria-label="Ежедневный челлендж">
      <div style={panelStyles.card}>
        <h2 style={panelStyles.heading}>📅 Челлендж дня</h2>

        <div style={panelStyles.challengeTitle}>{challenge.title}</div>
        <div style={panelStyles.challengeDesc}>{challenge.description}</div>

        {completed && (
          <div style={panelStyles.completedBadge}>✅ Выполнено!</div>
        )}

        {result && (
          <div style={panelStyles.attemptsInfo}>
            Попыток: {result.attempts} · Лучший результат: {result.bestTurns} ходов
          </div>
        )}

        {/* Name input for online leaderboard */}
        {firebaseOn && (
          <div style={panelStyles.nameInput}>
            <span style={{ fontSize: 14, color: '#aaa', minWidth: 50 }}>👤</span>
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="Ваш имя для рейтинга"
              maxLength={20}
              style={panelStyles.nameField}
              aria-label="Имя для рейтинга"
            />
          </div>
        )}

        {/* Leaderboard */}
        <div style={panelStyles.leaderboardSection}>
          <div style={panelStyles.leaderboardTitle}>
            🏆 Рейтинг сегодня
            {firebaseOn && <span style={panelStyles.onlineBadge}>🌐 Online</span>}
            {!firebaseOn && <span style={panelStyles.offlineBadge}>📱 Local</span>}
          </div>

          {firebaseOn && (
            <div style={panelStyles.tabGroup}>
              <button
                style={{ ...panelStyles.tab, ...(tab === 'global' ? panelStyles.tabActive : panelStyles.tabInactive) }}
                onClick={() => setTab('global')}
              >
                🌐 Глобальный
              </button>
              <button
                style={{ ...panelStyles.tab, ...(tab === 'local' ? panelStyles.tabActive : panelStyles.tabInactive) }}
                onClick={() => setTab('local')}
              >
                📱 Мои результаты
              </button>
            </div>
          )}

          {renderLeaderboard()}
        </div>

        <div style={panelStyles.buttonGroup}>
          <button
            aria-label="Начать челлендж"
            style={panelStyles.btnPrimary}
            onClick={onStartChallenge}
          >
            ▶ Начать челлендж
          </button>
          <button
            aria-label="Закрыть"
            style={panelStyles.btnSecondary}
            onClick={onClose}
          >
            ✕ Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}