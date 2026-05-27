import React, { useMemo } from 'react';
import { getAchievementProgress, getAchievementStats } from '../achievementsExtended';

export default function AchievementProgressBar({ achievement, stats, isUnlocked }) {
  const progress = useMemo(() => {
    if (isUnlocked) return { current: achievement.progress ? achievement.progress(stats).target : 1, target: 1, percentage: 100 };
    return getAchievementProgress(achievement, stats);
  }, [achievement, stats, isUnlocked]);

  if (!progress) return null;

  return (
    <div className="j-achievement-progress">
      <div className="j-achievement-progress__bar">
        <div
          className="j-achievement-progress__fill"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
      <div className="j-achievement-progress__text">
        {progress.current} / {progress.target}
      </div>
    </div>
  );
}

export function AchievementCard({ achievement, isUnlocked, stats }) {
  const progress = useMemo(() => {
    if (isUnlocked) return null;
    return getAchievementProgress(achievement, stats);
  }, [achievement, isUnlocked, stats]);

  return (
    <div className={`j-achievement-card ${isUnlocked ? 'j-achievement-card--unlocked' : 'j-achievement-card--locked'}`}>
      <div className="j-achievement-card__emoji">{achievement.emoji}</div>
      <div className="j-achievement-card__content">
        <div className="j-achievement-card__title">{achievement.title}</div>
        <div className="j-achievement-card__description">{achievement.description}</div>
        {progress && (
          <AchievementProgressBar achievement={achievement} stats={stats} isUnlocked={false} />
        )}
      </div>
      {isUnlocked && <div className="j-achievement-card__badge">✓</div>}
    </div>
  );
}

export function AchievementStats({ unlockedIds, stats }) {
  const achievementStats = useMemo(() => {
    return getAchievementStats(unlockedIds, stats);
  }, [unlockedIds, stats]);

  return (
    <div className="j-achievement-stats">
      <div className="j-achievement-stats__header">
        <h3>Статистика достижений</h3>
        <div className="j-achievement-stats__total">
          {achievementStats.unlocked} / {achievementStats.total}
        </div>
      </div>
      <div className="j-achievement-stats__bar">
        <div
          className="j-achievement-stats__fill"
          style={{ width: `${achievementStats.percentage}%` }}
        ></div>
      </div>
      <div className="j-achievement-stats__percentage">{achievementStats.percentage}%</div>
    </div>
  );
}
