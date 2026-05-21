/**
 * DailyChallengePanel.jsx — Daily Challenge UI for Jenga 3D
 * 
 * Shows:
 * - Today's challenge description and goal
 * - Completion status (completed / attempts)
 * - Leaderboard (top 10 local results)
 * - "Start Challenge" button
 */

import React, { useState } from 'react';
import {
  getDailyChallenge,
  isDailyChallengeCompleted,
  getDailyChallengeResult,
  getDailyLeaderboard,
} from './dailyChallengeTracker';

const panelStyles = {
  container: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'auto', zIndex: 20,
  },
  card: {
    background: 'rgba(0, 0, 0, 0.85)', color: '#fff',
    padding: '28px 36px', borderRadius: 16,
    backdropFilter: 'blur(12px)', textAlign: 'center',
    maxWidth: 400, width: '90%',
    border: '1px solid rgba(42,110,255,0.15)',
  },
  heading: { margin: '0 0 12px', fontSize: 24, fontWeight: 'bold' },
  challengeTitle: { fontSize: 18, fontWeight: 'bold', color: '#44ff88', marginBottom: 8 },
  challengeDesc: { fontSize: 14, color: '#aaa', marginBottom: 16, lineHeight: 1.5 },
  completedBadge: {
    display: 'inline-block', padding: '6px 16px', borderRadius: 8,
    background: 'rgba(68,255,136,0.15)', color: '#44ff88',
    fontSize: 14, fontWeight: 'bold', marginBottom: 12,
    border: '1px solid rgba(68,255,136,0.3)',
  },
  attemptsInfo: { fontSize: 13, color: '#888', marginBottom: 16 },
  leaderboardSection: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: 16, marginBottom: 16,
  },
  leaderboardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#2a6eff' },
  leaderboardRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '4px 8px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  leaderboardRank: { color: '#ffcc00', fontWeight: 'bold', minWidth: 24 },
  leaderboardName: { flex: 1, textAlign: 'left' },
  leaderboardScore: { fontWeight: 'bold', color: '#2a6eff' },
  emptyLeaderboard: { fontSize: 13, color: '#666', textAlign: 'center', padding: 8 },
  buttonGroup: { display: 'flex', gap: 10, justifyContent: 'center' },
  btnPrimary: {
    padding: '12px 20px', borderRadius: 10, border: 'none',
    background: '#2a6eff', color: '#fff', fontSize: 15,
    cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
  },
  btnSecondary: {
    padding: '10px 20px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: '#fff', fontSize: 14,
    cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
  },
};

export default function DailyChallengePanel({ onStartChallenge, onClose }) {
  const challenge = getDailyChallenge();
  const completed = isDailyChallengeCompleted();
  const result = getDailyChallengeResult();
  const leaderboard = getDailyLeaderboard();

  return (
    <div style={panelStyles.container} role="dialog" aria-label="Ежедневный челлендж">
      <div style={panelStyles.card}>
        <h2 style={panelStyles.heading}>📅 Челлендж дня</h2>

        <div style={panelStyles.challengeTitle}>{challenge.title}</div>
        <div style={panelStyles.challengeDesc}>{challenge.description}</div>

        {completed && (
          <div style={panelStyles.completedBadge}>✅ Выполнено!</div>
        )}

        {result && (
          <div style={panelStyles.attemptsInfo}>
            Попыток: {result.attempts} · Лучший результат: {result.bestTurns} ходов
          </div>
        )}

        {/* Leaderboard */}
        <div style={panelStyles.leaderboardSection}>
          <div style={panelStyles.leaderboardTitle}>🏆 Топ результатов сегодня</div>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, i) => (
              <div key={i} style={panelStyles.leaderboardRow}>
                <span style={panelStyles.leaderboardRank}>{i + 1}.</span>
                <span style={panelStyles.leaderboardName}>{entry.name}</span>
                <span style={panelStyles.leaderboardScore}>{entry.turns} ходов</span>
              </div>
            ))
          ) : (
            <div style={panelStyles.emptyLeaderboard}>
              Пока нет результатов. Начни челлендж!
            </div>
          )}
        </div>

        <div style={panelStyles.buttonGroup}>
          <button
            aria-label="Начать челлендж"
            style={panelStyles.btnPrimary}
            onClick={onStartChallenge}
          >
            ▶ Начать челлендж
          </button>
          <button
            aria-label="Закрыть"
            style={panelStyles.btnSecondary}
            onClick={onClose}
          >
            ✕ Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}