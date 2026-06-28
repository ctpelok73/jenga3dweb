import React, { useState, useCallback, useEffect } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { onlineService } from '../online/onlineService';

export default function OnlineLobby({ onBack, onStartGame }) {
  const [mode, setMode] = useState('classic');
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [view, setView] = useState('menu');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerNameState] = useState(onlineService.getPlayerName() || 'Аноним');
  const [editingName, setEditingName] = useState(false);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [globalStats, setGlobalStats] = useState(null);
  const modalRef = useModalA11y();
  const copiedTimerRef = React.useRef(null);

  useEffect(() => {
    loadStats();
    loadLeaderboard();
    loadGlobalStats();
  }, []);

  const loadStats = async () => {
    const s = await onlineService.getStats();
    if (s) setStats(s);
  };

  const loadLeaderboard = async () => {
    const lb = await onlineService.getLeaderboard(null, null, 10);
    setLeaderboard(lb);
  };

  const loadGlobalStats = async () => {
    const gs = await onlineService.getGlobalStats();
    if (gs) setGlobalStats(gs);
  };

  const handleCreateRoom = useCallback(() => {
    setError(null);
    onlineService.createRoom(mode);
    setView('waiting');
  }, [mode]);

  const handleQuickMatch = useCallback(() => {
    setError(null);
    onlineService.quickMatch(mode);
    setView('waiting');
  }, [mode]);

  const handleJoinRoom = useCallback(() => {
    if (!joinInput.trim()) {
      setError('Введите код комнаты');
      return;
    }
    setError(null);
    onlineService.joinRoom(joinInput.trim());
  }, [joinInput]);

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать');
    }
  }, [roomCode]);

  const handleNameSave = useCallback(async () => {
    if (playerName.trim().length < 1 || playerName.trim().length > 20) {
      setError('Имя должно быть от 1 до 20 символов');
      return;
    }
    await onlineService.updatePlayerName(playerName.trim());
    setEditingName(false);
  }, [playerName]);

  useEffect(() => {
    const cleanup1 = onlineService.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setView('waiting');
    });

    const cleanup2 = onlineService.on('room_joined', (data) => {
      onStartGame({ ...data, mode: 'online' });
    });

    const cleanup3 = onlineService.on('opponent_joined', (data) => {
      onStartGame({ ...data, mode: 'online', roomCode });
    });

    const cleanup4 = onlineService.on('waiting_for_opponent', (data) => {
      setRoomCode(data.roomCode);
      setView('waiting');
    });

    const cleanup5 = onlineService.on('error', (data) => {
      setError(data?.message || 'Ошибка соединения');
    });

    return () => {
      cleanup1?.();
      cleanup2?.();
      cleanup3?.();
      cleanup4?.();
      cleanup5?.();
    };
  }, [onStartGame, roomCode]);

  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current);
  }, []);

  if (view === 'waiting') {
    return (
      <div className="j-overlay" role="dialog" aria-label="Ожидание противника" ref={modalRef}>
        <div className="j-card">
          <h2 className="j-heading">Ожидание противника</h2>
          <div className="j-online-waiting">
            <div className="j-online-waiting__spinner" />
            <p>Код комнаты:</p>
            <div className="j-online-code" onClick={handleCopyCode} title="Нажмите чтобы скопировать">
              {roomCode || '...'}
            </div>
            <button 
              className={`j-btn j-btn--small ${copied ? 'j-btn--success' : ''}`}
              onClick={handleCopyCode}
            >
              {copied ? '✓ Скопировано' : '📋 Копировать код'}
            </button>
            <p className="j-online-hint">
              Отправьте этот код другому игроку
            </p>
          </div>
          <button className="j-btn j-btn--secondary j-btn--full" onClick={() => { onlineService.leaveRoom(); setView('menu'); }}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="j-overlay" role="dialog" aria-label="Онлайн лобби" ref={modalRef}>
      <div className="j-card">
        <h2 className="j-heading j-heading--gradient">🌐 Онлайн</h2>
        
        {error && (
          <div className="j-online-error" onClick={() => setError(null)}>
            ⚠ {error}
          </div>
        )}

        <div className="j-online-profile">
          {editingName ? (
            <div className="j-online-name-edit">
              <input
                className="j-input"
                value={playerName}
                onChange={(e) => setPlayerNameState(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <button className="j-btn j-btn--small" onClick={handleNameSave}>✓</button>
            </div>
          ) : (
            <div className="j-online-name" onClick={() => setEditingName(true)}>
              👤 {playerName} <span className="j-online-name-edit-hint">✏️</span>
            </div>
          )}
        </div>

        {stats && stats.stats && (
          <div className="j-online-stats">
            <div className="j-stat">
              <div className="j-stat__val">{stats.stats.wins || 0}</div>
              <div className="j-stat__label">Побед</div>
            </div>
            <div className="j-stat">
              <div className="j-stat__val">{stats.stats.losses || 0}</div>
              <div className="j-stat__label">Поражений</div>
            </div>
            <div className="j-stat">
              <div className="j-stat__val">{stats.stats.best_score || 0}</div>
              <div className="j-stat__label">Рекорд</div>
            </div>
          </div>
        )}

        {globalStats && (
          <div className="j-online-global-stats">
            <span>🌐 Онлайн: {globalStats.totalPlayers} игроков | {globalStats.totalGames} игр</span>
          </div>
        )}

        <div className="j-mode-group" style={{ marginBottom: 12 }}>
          <button
            className={`j-mode-btn${mode === 'classic' ? ' is-active' : ''}`}
            onClick={() => setMode('classic')}
          >
            🎯 Классика
          </button>
          <button
            className={`j-mode-btn${mode === 'speed' ? ' is-active' : ''}`}
            onClick={() => setMode('speed')}
          >
            ⚡ Speed
          </button>
        </div>

        <button className="j-btn j-btn--primary j-btn--full j-mb-8" onClick={handleQuickMatch}>
          🔍 Быстрый поиск
        </button>

        <button className="j-btn j-btn--secondary j-btn--full j-mb-8" onClick={handleCreateRoom}>
          ➕ Создать комнату
        </button>

        <div className="j-online-join">
          <input
            className="j-input j-input--code"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
            placeholder="Код комнаты"
            maxLength={6}
          />
          <button 
            className="j-btn j-btn--secondary" 
            onClick={handleJoinRoom}
            disabled={!joinInput.trim()}
          >
            Войти
          </button>
        </div>

        {leaderboard.length > 0 && (
          <div className="j-online-leaderboard">
            <h3 className="j-heading j-heading--secondary">🏆 Топ игроков</h3>
            <div className="j-leaderboard-list">
              {leaderboard.map((entry, idx) => (
                <div key={entry.id || idx} className="j-leaderboard-item">
                  <span className="j-leaderboard-rank">#{idx + 1}</span>
                  <span className="j-leaderboard-name">{entry.player_name}</span>
                  <span className="j-leaderboard-score">{entry.score} ходов</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="j-btn j-btn--secondary j-btn--full" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}
