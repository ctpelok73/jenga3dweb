import React from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { ACHIEVEMENTS, getUnlockedAchievements, getLockedAchievements, getAchievementData } from '../achievementsTracker';
import AchievementProgressBar, { AchievementCard, AchievementStats } from '../components/AchievementProgressBar';
import { getAchievementStats } from '../achievementsExtended';

export default function AchievementsPanel({ onClose }) {
  const unlocked = getUnlockedAchievements();
  const locked = getLockedAchievements();
  const total = ACHIEVEMENTS.length;
  const data = getAchievementData();
  const unlockedIds = unlocked.map(a => a.id);
  const stats = getAchievementStats(unlockedIds, data.stats);
  const modalRef = useModalA11y({ onEscape: onClose });

  return (
    <div className="j-overlay" role="dialog" aria-label="Достижения" ref={modalRef}>
      <div className="j-card j-card--wide j-card--left">
        <div className="j-header">
          <h2 className="j-heading j-heading--sm">🏆 Достижения</h2>
          <button onClick={onClose} aria-label="Закрыть достижения" className="j-close-btn">✕</button>
        </div>

        <AchievementStats unlockedIds={unlockedIds} stats={stats} />

        <div className="j-ach-grid">
          {unlocked.map(a => (
            <AchievementCard key={a.id} achievement={a} isUnlocked={true} stats={data.stats} unlockedAt={data.unlocked[a.id]?.unlockedAt} />
          ))}
          {locked.map(a => (
            <AchievementCard key={a.id} achievement={a} isUnlocked={false} stats={data.stats} />
          ))}
        </div>
        <div className="j-mt-18">
          <button className="j-btn j-btn--primary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}