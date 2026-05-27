import React, { useState, useEffect, useCallback } from 'react';

/**
 * PauseMenu: полноэкранное меню паузы
 * - CSS-классы with :hover/:active/:focus (defined in ui.css)
 * - Подтверждение для деструктивных действий
 * - Escape для закрытия
 * - Адаптивный дизайн для мобильных
 */

/* ─── Confirmation dialog ─── */
function ConfirmDialog({ icon, title, text, confirmLabel, confirmVariant, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="pm-confirm-overlay" role="alertdialog" aria-label={title}>
      <div className="pm-confirm-card">
        <div className="pm-confirm-icon">{icon}</div>
        <h3 className="pm-confirm-title">{title}</h3>
        <p className="pm-confirm-text">{text}</p>
        <div className="pm-confirm-buttons">
          <button className="pm-confirm-btn pm-confirm-btn--cancel" onClick={onCancel} aria-label="Отмена">
            Отмена
          </button>
          <button
            className={`pm-confirm-btn pm-confirm-btn--${confirmVariant}`}
            onClick={onConfirm}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [confirmAction, setConfirmAction] = useState(null); // 'restart' | 'menu' | null

  const playerName = playerMode === 2 ? (currentPlayer === 0 ? 'Игрок 1' : 'Игрок 2') : playerMode === 3 ? (currentPlayer === 0 ? 'Игрок 1' : '🤖 ИИ') : '';
  const playerTagClass = currentPlayer === 0 ? 'pm-player-tag--p1' : currentPlayer === 1 && playerMode === 3 ? 'pm-player-tag--ai' : 'pm-player-tag--p2';

  // Escape key to resume
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (confirmAction) {
        setConfirmAction(null);
      } else {
        onResume();
      }
    }
  }, [onResume, confirmAction]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleRestartClick = () => setConfirmAction('restart');
  const handleBackToMenuClick = () => setConfirmAction('menu');

  const handleConfirmRestart = () => { setConfirmAction(null); onRestart(); };
  const handleConfirmMenu = () => { setConfirmAction(null); onBackToMenu(); };
  const handleCancelConfirm = () => setConfirmAction(null);

  // When opening settings/achievements, close pause menu first
  const handleOpenSettings = () => { onOpenSettings(); };
  const handleOpenAchievements = () => { onOpenAchievements(); };

  return (
    <>
      <div className="pm-overlay" role="dialog" aria-label="Меню паузы">
        <div className="pm-card">
          <h2 className="pm-heading">⏸ Пауза</h2>

          {(playerMode === 2 || playerMode === 3) && (
            <div className={`pm-player-tag ${playerTagClass}`}>
              ▸ Ход: {playerName}
            </div>
          )}

          <p className="pm-subtext">Игра приостановлена</p>

          <div className="pm-stats">
            <div className="pm-stat">
              <div className="pm-stat-val">{turnCount}</div>
              <div className="pm-stat-label">Ходов</div>
            </div>
            <div className="pm-stat">
              <div className="pm-stat-val">{towerHeight}</div>
              <div className="pm-stat-label">Слоёв</div>
            </div>
          </div>

          <div className="pm-buttons">
            <button
              className="pm-btn pm-btn--primary"
              onClick={onResume}
              aria-label="Продолжить игру"
            >
              ▶ Продолжить
            </button>

            <button
              className="pm-btn pm-btn--secondary"
              onClick={handleOpenSettings}
              aria-label="Настройки"
            >
              ⚙ Настройки
            </button>

            <button
              className="pm-btn pm-btn--secondary"
              onClick={handleOpenAchievements}
              aria-label="Достижения"
            >
              🏆 Достижения
            </button>

            <div className="pm-divider" />

            <button
              className="pm-btn pm-btn--danger"
              onClick={handleRestartClick}
              aria-label="Начать заново"
            >
              🔄 Начать заново
            </button>

            <button
              className="pm-btn pm-btn--ghost"
              onClick={handleBackToMenuClick}
              aria-label="Вернуться в главное меню"
            >
              🏠 В главное меню
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation dialogs */}
      {confirmAction === 'restart' && (
        <ConfirmDialog
          icon="🔄"
          title="Начать заново?"
          text="Текущий прогресс будет потерян. Вы уверены?"
          confirmLabel="Начать заново"
          confirmVariant="confirm-warning"
          onConfirm={handleConfirmRestart}
          onCancel={handleCancelConfirm}
        />
      )}

      {confirmAction === 'menu' && (
        <ConfirmDialog
          icon="🏠"
          title="Выйти в меню?"
          text="Текущая игра будет потеряна. Вы уверены?"
          confirmLabel="Выйти в меню"
          confirmVariant="confirm-danger"
          onConfirm={handleConfirmMenu}
          onCancel={handleCancelConfirm}
        />
      )}
    </>
  );
}