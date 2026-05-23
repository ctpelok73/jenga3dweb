import React from 'react';
import { baseStyles, PLAYER_COLORS, PLAYER_NAMES } from '../styles';

export default function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing, currentPlayer, playerMode, aiThinking, onPauseMenu }) {
  const isAiTurn = playerMode === 3 && currentPlayer === 1;
  const effectiveCanMove = canMove && !isAiTurn && !aiThinking;
  const playerColor = playerMode === 2 ? PLAYER_COLORS[currentPlayer] : playerMode === 3 ? PLAYER_COLORS[currentPlayer] : '#fff';
  const playerName = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : playerMode === 3 ? PLAYER_NAMES[currentPlayer] : '';
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
        {(playerMode === 2 || playerMode === 3) && (
          <div style={{ fontSize: 13, color: playerColor, fontWeight: 'bold', marginBottom: 4 }}>
            ▸ Ход: {playerName}
          </div>
        )}
        {aiThinking && <div style={{ color: '#aa44ff', fontSize: 13, marginBottom: 6 }}>🤖 ИИ думает...</div>}
        {stabilizing && <div style={{ color: '#88aaff', fontSize: 13, marginBottom: 6 }}>⏳ Стабилизация...</div>}
        <div style={baseStyles.info} aria-live="polite">
          {message && <div style={baseStyles.message}>{message}</div>}
          <div>Слой: {towerHeight} · Ходов: {turnCount}</div>
          {effectiveCanMove && <div style={{ fontSize: 12, color: '#88ff88', marginTop: 6 }}>💡 Нажми на зелёный слот или кнопку ниже</div>}
        </div>
        <div style={baseStyles.buttons}>
          <button aria-label="Сделать ход" style={{ ...baseStyles.btn, opacity: effectiveCanMove ? 1 : 0.4 }} disabled={!effectiveCanMove} onClick={onMakeMove}>
            Сделать ход
          </button>
          <button aria-label="Начать заново" style={baseStyles.btnSecondary} onClick={onRestart}>↻</button>
        </div>
      </div>
    </div>
  );
}