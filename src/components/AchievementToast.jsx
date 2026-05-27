import React, { useEffect } from 'react';

export default function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!achievement) return null;

  return (
    <div role="alert" aria-live="assertive" className="j-toast">
      <div className="j-toast__body">
        <span className="j-toast__emoji">{achievement.emoji}</span>
        <div className="j-toast__content">
          <div className="j-toast__label">🏆 Достижение!</div>
          <div className="j-toast__title">{achievement.title}</div>
          <div className="j-toast__desc">{achievement.description}</div>
        </div>
        <button onClick={onDismiss} aria-label="Закрыть уведомление" className="j-toast__close">✕</button>
      </div>
    </div>
  );
}