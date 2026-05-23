import React, { useState, useEffect, useCallback } from 'react';

/**
 * PauseMenu: полноэкранное меню паузы
 * - CSS-классы с :hover/:active/:focus вместо inline JS
 * - Подтверждение для деструктивных действий
 * - Escape для закрытия
 * - Адаптивный дизайн для мобильных
 */

/* ─── Inline CSS with proper pseudo-class support ─── */
const CSS = `
.pm-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; z-index: 30;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  animation: pmOverlayIn 0.25s ease-out;
}

.pm-card {
  background: linear-gradient(145deg, rgba(18, 24, 42, 0.94) 0%, rgba(8, 12, 28, 0.97) 100%);
  color: #fff; padding: 28px 24px; border-radius: 20px;
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  text-align: center; max-width: 340px; width: 88%;
  border: 1px solid rgba(100, 160, 255, 0.12);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 60px rgba(42, 110, 255, 0.06), inset 0 1px 0 rgba(255,255,255,0.06);
  animation: pmCardIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 88vh; overflow-y: auto; overflow-x: hidden;
}

.pm-heading {
  margin: 0 0 2px; font-size: 24px; font-weight: 700;
  letter-spacing: 0.3px; line-height: 1.3;
}

.pm-player-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 20px;
  font-size: 13px; font-weight: 700; margin-bottom: 6px;
  animation: pmPulse 2s ease-in-out infinite;
}

.pm-player-tag--p1 {
  background: rgba(42, 110, 255, 0.12); color: #5b9aff;
  border: 1px solid rgba(42, 110, 255, 0.25);
}
.pm-player-tag--p2 {
  background: rgba(255, 68, 68, 0.12); color: #ff6b6b;
  border: 1px solid rgba(255, 68, 68, 0.25);
}

.pm-player-tag--ai {
  background: rgba(170, 68, 255, 0.12); color: #bb66ff;
  border: 1px solid rgba(170, 68, 255, 0.25);
}

.pm-subtext {
  font-size: 13px; color: rgba(255,255,255,0.4);
  margin: 0 0 16px; line-height: 1.4;
}

.pm-stats {
  display: flex; justify-content: center; gap: 28px;
  margin-bottom: 20px; padding: 14px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.pm-stat { text-align: center; }

.pm-stat-val {
  font-size: 22px; font-weight: 700; color: #5b9aff; line-height: 1.2;
}

.pm-stat-label {
  font-size: 11px; color: rgba(255,255,255,0.4);
  margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px;
}

.pm-buttons {
  display: flex; flex-direction: column; gap: 6px;
}

.pm-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 13px 18px; border-radius: 12px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  width: 100%; letter-spacing: 0.2px;
  transition: all 0.2s ease; border: none; outline: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.pm-btn:focus-visible {
  outline: 2px solid #5b9aff; outline-offset: 2px;
}

.pm-btn--primary {
  background: linear-gradient(135deg, #2a6eff 0%, #1a5ecc 100%);
  color: #fff; font-weight: 700; font-size: 16px;
  box-shadow: 0 4px 20px rgba(42, 110, 255, 0.35);
  padding: 14px 18px;
}
.pm-btn--primary:hover {
  background: linear-gradient(135deg, #3d80ff 0%, #2a6eff 100%);
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(42, 110, 255, 0.45);
}
.pm-btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 12px rgba(42, 110, 255, 0.3);
  background: linear-gradient(135deg, #1a5ecc 0%, #0f4db8 100%);
}

.pm-btn--secondary {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
}
.pm-btn--secondary:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.15);
  color: #fff;
}
.pm-btn--secondary:active {
  background: rgba(255,255,255,0.12);
}

.pm-btn--danger {
  background: rgba(255, 80, 80, 0.06);
  border: 1px solid rgba(255, 80, 80, 0.15);
  color: #ff6b6b;
}
.pm-btn--danger:hover {
  background: rgba(255, 80, 80, 0.12);
  border-color: rgba(255, 80, 80, 0.3);
  color: #ff8888;
}
.pm-btn--danger:active {
  background: rgba(255, 80, 80, 0.18);
}

.pm-btn--ghost {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.35);
  font-size: 13px;
}
.pm-btn--ghost:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.55);
}
.pm-btn--ghost:active {
  background: rgba(255,255,255,0.08);
}

.pm-divider {
  height: 1px; background: rgba(255,255,255,0.04);
  margin: 4px 0;
}

/* ─── Confirmation overlay ─── */
.pm-confirm-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; z-index: 31;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  animation: pmOverlayIn 0.2s ease-out;
}

.pm-confirm-card {
  background: linear-gradient(145deg, rgba(18, 24, 42, 0.96) 0%, rgba(8, 12, 28, 0.98) 100%);
  color: #fff; padding: 24px 22px; border-radius: 16px;
  text-align: center; max-width: 300px; width: 85%;
  border: 1px solid rgba(255, 80, 80, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 80, 80, 0.06);
  animation: pmCardIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.pm-confirm-icon {
  font-size: 36px; margin-bottom: 8px; line-height: 1;
}

.pm-confirm-title {
  font-size: 18px; font-weight: 700; margin: 0 0 6px;
}

.pm-confirm-text {
  font-size: 13px; color: rgba(255,255,255,0.5);
  margin: 0 0 20px; line-height: 1.5;
}

.pm-confirm-buttons {
  display: flex; gap: 8px;
}

.pm-confirm-btn {
  flex: 1; padding: 12px 16px; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease; border: none; outline: none;
  -webkit-tap-highlight-color: transparent;
}
.pm-confirm-btn:focus-visible {
  outline: 2px solid #5b9aff; outline-offset: 2px;
}

.pm-confirm-btn--cancel {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7);
}
.pm-confirm-btn--cancel:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.pm-confirm-btn--confirm-danger {
  background: rgba(255, 80, 80, 0.15);
  border: 1px solid rgba(255, 80, 80, 0.3);
  color: #ff6b6b;
}
.pm-confirm-btn--confirm-danger:hover {
  background: rgba(255, 80, 80, 0.25);
  color: #ff8888;
}
.pm-confirm-btn--confirm-danger:active {
  background: rgba(255, 80, 80, 0.35);
}

.pm-confirm-btn--confirm-warning {
  background: rgba(255, 180, 0, 0.12);
  border: 1px solid rgba(255, 180, 0, 0.25);
  color: #ffbb44;
}
.pm-confirm-btn--confirm-warning:hover {
  background: rgba(255, 180, 0, 0.2);
  color: #ffcc66;
}

/* ─── Animations ─── */
@keyframes pmOverlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pmCardIn {
  from { transform: scale(0.9) translateY(12px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes pmPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* ─── Mobile adjustments ─── */
@media (max-width: 400px) {
  .pm-card { padding: 20px 16px; border-radius: 16px; }
  .pm-heading { font-size: 20px; }
  .pm-btn { padding: 11px 14px; font-size: 14px; }
  .pm-btn--primary { padding: 12px 14px; font-size: 15px; }
  .pm-stats { gap: 20px; }
  .pm-stat-val { font-size: 18px; }
}
`;

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
      <style>{CSS}</style>

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