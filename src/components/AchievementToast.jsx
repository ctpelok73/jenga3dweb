import React, { useEffect } from 'react';

export default function AchievementToast({ achievement, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!achievement) return null;

  return (
    <div role="alert" aria-live="assertive" style={{
      position: 'fixed', top: 16, right: 16, zIndex: 200,
      background: 'rgba(0, 0, 0, 0.9)', color: '#fff',
      padding: '14px 20px', borderRadius: 12,
      border: '1px solid rgba(42,110,255,0.4)',
      boxShadow: '0 4px 20px rgba(42,110,255,0.3)',
      backdropFilter: 'blur(12px)',
      animation: 'slideInRight 0.4s ease-out',
      maxWidth: 300, pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{achievement.emoji}</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#44ff88' }}>🏆 Достижение!</div>
          <div style={{ fontSize: 15, fontWeight: 'bold', marginTop: 2 }}>{achievement.title}</div>
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{achievement.description}</div>
        </div>
        <button onClick={onDismiss} aria-label="Закрыть уведомление" style={{
          background: 'none', border: 'none', color: '#666', fontSize: 18,
          cursor: 'pointer', padding: '0 4px', marginLeft: 'auto',
        }}>✕</button>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}