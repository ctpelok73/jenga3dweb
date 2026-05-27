import React from 'react';
import { PLAYER_NAMES } from '../styles';

export default function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing, currentPlayer, playerMode, aiThinking, onPauseMenu }) {
  const isAiTurn = playerMode === 3 && currentPlayer === 1;
  const effectiveCanMove = canMove && !isAiTurn && !aiThinking;
  const playerName = (playerMode === 2 || playerMode === 3) ? PLAYER_NAMES[currentPlayer] : '';
  const playerClass = currentPlayer === 0 ? 'j-player--p1' : (currentPlayer === 1 && playerMode === 3 ? 'j-player--ai' : 'j-player--p2');
  return (
    <div className="j-hud-overlay" role="status" aria-label="Игровая панель">
      <div className="j-hud">
        <div className="j-hud__header">
          <h2 className="j-hud__title">🧱 Jenga</h2>
          <button onClick={onPauseMenu} aria-label="Открыть меню паузы" className="j-hud__menu-btn" title="Меню">☰</button>
        </div>
        {(playerMode === 2 || playerMode === 3) && (
          <div className={`j-hud__player-tag ${playerClass}`}>
            ▸ Ход: {playerName}
          </div>
        )}
        {aiThinking && <div className="j-hud__status j-hud__status--ai">🤖 ИИ думает...</div>}
        {stabilizing && <div className="j-hud__status j-hud__status--stabilizing">⏳ Стабилизация...</div>}
        <div className="j-hud__info" aria-live="polite">
          {message && <div className="j-hud__message">{message}</div>}
          <div>Слой: {towerHeight} · Ходов: {turnCount}</div>
          {effectiveCanMove && <div className="j-hud__status j-hud__status--hint">💡 Нажми на зелёный слот или кнопку ниже</div>}
        </div>
        <div className="j-hud__buttons">
          <button aria-label="Сделать ход" className="j-hud-btn j-hud-btn--move" disabled={!effectiveCanMove} onClick={onMakeMove}>
            Сделать ход
          </button>
          <button aria-label="Начать заново" className="j-hud-btn j-hud-btn--restart" onClick={onRestart}>↻</button>
        </div>
      </div>
    </div>
  );
}