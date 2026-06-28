import React, { useState, useCallback, useEffect } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { PLAYER_NAMES } from '../styles';
import { onlineService } from '../online/onlineService';

export default function OnlineGameOver({ gameResult, opponentName, onRestart, onBackToMenu }) {
  const [stats, setStats] = useState(null);
  const modalRef = useModalA11y();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const s = await onlineService.getStats();
    if (s) setStats(s);
  };

  const winner = gameResult?.winner;
  const collapsed = gameResult?.collapsed;
  const turnCount = gameResult?.turnCount || 0;
  const pending = gameResult?.pending;
  const opponentLeft = gameResult?.opponentLeft;

  return (
    <div className="j-overlay" role="dialog" aria-label="Конец игры" ref={modalRef}>
      <div className="j-card">
        <div className="j-gameover-icon">{pending ? '⏳' : collapsed ? '💥' : '⏱'}</div>
        <h1 className={`j-heading ${pending ? '' : winner ? 'j-heading--green' : 'j-heading--danger'}`}>
          {pending ? '⏳ Ожидание...' : opponentLeft ? '🎉 Победа!' : winner ? '🎉 Победа!' : '😢 Поражение'}
        </h1>
        
        {opponentName && (
          <div className="j-gameover-result">
            {winner ? `${opponentName} уронил башню!` : `Вы уронили башню!`}
          </div>
        )}

        <div className="j-gameover-score">{turnCount}</div>
        <div className="j-gameover-score-label">ходов сделано</div>

        {stats && stats.stats && (
          <div className="j-stats">
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

        <div className="j-gameover-actions">
          <button className="j-btn j-btn--primary" onClick={onRestart}>
            🔄 Реванш
          </button>
          <button className="j-btn j-btn--secondary" onClick={onBackToMenu}>
            ← В меню
          </button>
        </div>
      </div>
    </div>
  );
}
