import React from 'react';
import { screenStyles, baseStyles } from '../styles';
import { ACHIEVEMENTS, getUnlockedAchievements, getLockedAchievements, getAchievementData } from '../achievementsTracker';

export default function AchievementsPanel({ onClose }) {
  const unlocked = getUnlockedAchievements();
  const locked = getLockedAchievements();
  const total = ACHIEVEMENTS.length;
  const data = getAchievementData();

  return (
    <div style={screenStyles.container} role="dialog" aria-label="Достижения">
      <div style={{ ...screenStyles.card, maxWidth: 420, textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ ...screenStyles.heading, margin: 0, fontSize: 22 }}>🏆 Достижения</h2>
          <button onClick={onClose} aria-label="Закрыть достижения" style={{ background: 'none', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ fontSize: 14, color: '#2a6eff', fontWeight: 'bold', marginBottom: 16 }}>
          {unlocked.length}/{total} разблокировано
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8,
        }}>
          {unlocked.map(a => (
            <div key={a.id} style={{
              background: 'rgba(42,110,255,0.1)', borderRadius: 10, padding: '10px 12px',
              border: '1px solid rgba(42,110,255,0.25)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{a.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{a.description}</div>
              {data.unlocked[a.id] && (
                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                  ✓ {new Date(data.unlocked[a.id].unlockedAt).toLocaleDateString('ru')}
                </div>
              )}
            </div>
          ))}
          {locked.map(a => (
            <div key={a.id} style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 12px',
              border: '1px solid rgba(255,255,255,0.05)', opacity: 0.6,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4, filter: 'grayscale(1)' }}>🔒</div>
              <div style={{ fontSize: 13, fontWeight: 'bold', color: '#888' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{a.description}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button style={baseStyles.btn} onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}