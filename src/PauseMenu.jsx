import React from 'react';

/**
 * PauseMenu: полноэкранное меню паузы
 * Кнопки: Продолжить, Настройки, Достижения, Начать заново, В главное меню
 * Показывает текущую статистику игры (ходы, слой)
 */

const menuStyles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 30,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(6px)',
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '28px 36px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 340, width: '90%',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'pauseFadeIn 0.25s ease-out',
  },
  heading: { margin: '0 0 8px', fontSize: 24, fontWeight: 'bold' },
  subtext: { fontSize: 14, color: '#aaa', marginBottom: 20, lineHeight: 1.5 },
  statRow: { display: 'flex', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { textAlign: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#2a6eff' },
  statLabel: { fontSize: 11, color: '#888' },
  buttonGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  btnPrimary: {
    padding: '12px 20px', borderRadius: 10, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 15,
    cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
    width: '100%',
  },
  btnSecondary: {
    padding: '10px 20px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
    width: '100%',
  },
  btnDanger: {
    padding: '10px 20px', borderRadius: 10,
    border: '1px solid rgba(255,68,68,0.3)',
    background: 'rgba(255,68,68,0.1)', color: '#ff6666', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
    width: '100%',
  },
};

export function PauseMenu({
  turnCount,
  towerHeight,
  currentPlayer,
  playerMode,
  onResume,
  onOpenSettings,
  onOpenAchievements,
  onRestart,
  onBackToMenu,
}) {
  const playerName = playerMode === 2 ? (currentPlayer === 0 ? 'Игрок 1' : 'Игрок 2') : '';

  return (
    <div style={menuStyles.container}>
      <div style={menuStyles.card}>
        <style>{`
          @keyframes pauseFadeIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <h2 style={menuStyles.heading}>⏸ Пауза</h2>
        {playerMode === 2 && (
          <p style={{ fontSize: 13, color: currentPlayer === 0 ? '#2a6eff' : '#ff4444', fontWeight: 'bold', marginBottom: 4 }}>
            ▸ Сейчас ходит: {playerName}
          </p>
        )}
        <p style={menuStyles.subtext}>Игра приостановлена</p>

        <div style={menuStyles.statRow}>
          <div style={menuStyles.statItem}>
            <div style={menuStyles.statValue}>{turnCount}</div>
            <div style={menuStyles.statLabel}>Ходов</div>
          </div>
          <div style={menuStyles.statItem}>
            <div style={menuStyles.statValue}>{towerHeight}</div>
            <div style={menuStyles.statLabel}>Слоёв</div>
          </div>
        </div>

        <div style={menuStyles.buttonGroup}>
          <button style={menuStyles.btnPrimary} onClick={onResume}>
            ▶ Продолжить
          </button>
          <button style={menuStyles.btnSecondary} onClick={onOpenSettings}>
            ⚙️ Настройки
          </button>
          <button style={menuStyles.btnSecondary} onClick={onOpenAchievements}>
            🏆 Достижения
          </button>
          <button style={menuStyles.btnDanger} onClick={onRestart}>
            🔄 Начать заново
          </button>
          <button
            style={{ ...menuStyles.btnDanger, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#888' }}
            onClick={onBackToMenu}
          >
            🏠 В главное меню
          </button>
        </div>
      </div>
    </div>
  );
}