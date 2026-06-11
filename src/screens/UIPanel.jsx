import React, { useState, useCallback, useMemo } from 'react';
import { PLAYER_NAMES } from '../styles';
import { getVolumeLevel, updateMasterVolume } from '../soundEngine';
import { updateSetting } from '../settingsTracker';
import { getAchievementData } from '../achievementsTracker';
import { ACHIEVEMENTS_EXTENDED, getAchievementProgress } from '../achievementsExtended';

export default function UIPanel({ canMove, onMakeMove, onRestart, message, towerHeight, turnCount, stabilizing, currentPlayer, playerMode, aiThinking, onPauseMenu, moveTimeLeft, gameMode, speedTimeLeft }) {
  const isAiTurn = playerMode === 3 && currentPlayer === 1;
  const effectiveCanMove = canMove && !isAiTurn && !aiThinking;
  const playerName = (playerMode === 2 || playerMode === 3) ? PLAYER_NAMES[currentPlayer] : '';
  const playerClass = currentPlayer === 0 ? 'j-player--p1' : (currentPlayer === 1 && playerMode === 3 ? 'j-player--ai' : 'j-player--p2');

  const [isMuted, setIsMuted] = useState(() => getVolumeLevel() === 0);
  const [savedVolume, setSavedVolume] = useState(() => {
    const vol = getVolumeLevel();
    return vol === 0 ? 70 : vol;
  });

  const toggleMute = useCallback(() => {
    if (isMuted) {
      updateSetting('volume', savedVolume);
      updateMasterVolume();
      setIsMuted(false);
    } else {
      const currentVol = getVolumeLevel();
      if (currentVol > 0) setSavedVolume(currentVol);
      updateSetting('volume', 0);
      updateMasterVolume();
      setIsMuted(true);
    }
  }, [isMuted, savedVolume]);

  const nearestAchievement = useMemo(() => {
    const data = getAchievementData();
    let best = null;
    let bestPct = -1;
    for (const ach of ACHIEVEMENTS_EXTENDED) {
      if (data.unlocked[ach.id]) continue;
      const prog = getAchievementProgress(ach, data.stats);
      if (!prog) continue;
      if (prog.percentage > bestPct) {
        bestPct = prog.percentage;
        best = { ...ach, progress: prog };
      }
    }
    return best;
  }, [turnCount]);

  return (
    <div className="j-hud-overlay" aria-label="Игровая панель">
      <div className="j-hud">
        <div className="j-hud__header">
          <h2 className="j-hud__title">🧱 Jenga</h2>
          <div className="j-hud__header-actions">
            <button
              className="j-hud__menu-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button onClick={onPauseMenu} aria-label="Открыть меню паузы" className="j-hud__menu-btn" title="Меню">☰</button>
          </div>
        </div>
        {(playerMode === 2 || playerMode === 3) && (
          <div className={`j-hud__player-tag ${playerClass}`}>
            ▸ Ход: {playerName}
          </div>
        )}
        {gameMode === 'speed' && speedTimeLeft !== null && (
          <div className={`j-hud__speed-timer${speedTimeLeft <= 10 ? ' j-hud__speed-timer--critical' : ''}`} aria-hidden="true">
            {Math.floor(speedTimeLeft / 60)}:{String(speedTimeLeft % 60).padStart(2, '0')}
          </div>
        )}
        {aiThinking && <div className="j-hud__status j-hud__status--ai">🤖 ИИ думает...</div>}
        {stabilizing && <div className="j-hud__status j-hud__status--stabilizing">⏳ Стабилизация...</div>}
        {moveTimeLeft !== null && (
          <div className={`j-hud__timer ${moveTimeLeft <= 5 ? 'j-hud__timer--warning' : ''}`} aria-hidden="true">
            ⏱ {moveTimeLeft}с
          </div>
        )}
        <div className="j-hud__info" aria-live="polite">
          {message && <div className="j-hud__message">{message}</div>}
          <div>Слой: {towerHeight} · Ходов: {turnCount}</div>
          {effectiveCanMove && <div className="j-hud__status j-hud__status--hint">💡 Нажми на зелёный слот или кнопку ниже</div>}
        </div>
        <div className="j-hud__buttons">
          <button aria-label="Сделать ход" className="j-hud-btn j-hud-btn--move" disabled={!effectiveCanMove} onClick={onMakeMove}>
            Сделать ход
          </button>
          <button aria-label="Начать заново" className="j-hud-btn j-hud-btn--restart" onClick={onRestart}>↻</button>
        </div>
        {nearestAchievement && (
          <div className="j-hud__achievement">
            <div className="j-hud__achievement-label">
              {nearestAchievement.emoji} {nearestAchievement.title}
            </div>
            <div className="j-hud__achievement-bar">
              <div className="j-hud__achievement-fill" style={{ width: `${nearestAchievement.progress.percentage}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}