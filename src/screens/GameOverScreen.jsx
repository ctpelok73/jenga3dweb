import React, { useState } from 'react';
import { PLAYER_NAMES } from '../styles';
import { getBestScore, getTotalGames } from '../scoreTracker';
import SocialSharePanel from '../SocialSharePanel';
import QRCodeDisplay from '../QRCodeDisplay';
import RewardedVideoButton from '../RewardedVideoButton';
import ReplayPlayer from '../components/ReplayPlayer';
import { generateShareLink, listGameReplays } from '../shareService';

export default function GameOverScreen({ turns, onRestart, currentPlayer, playerMode, onContinueAfterCollapse, continuedAfterCollapse }) {
  const best = getBestScore();
  const total = getTotalGames();
  const loser = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : playerMode === 3 ? PLAYER_NAMES[currentPlayer] : 'Вы';
  const [showQR, setShowQR] = useState(false);
  const [showReplays, setShowReplays] = useState(false);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const replays = listGameReplays();
  const playerClass = currentPlayer === 0 ? 'j-player--p1' : (currentPlayer === 1 && playerMode === 3 ? 'j-player--ai' : 'j-player--p2');

  const handleShare = () => {
    const link = generateShareLink({
      turns,
      difficulty: 'normal',
    });
    navigator.clipboard.writeText(link);
    alert('Ссылка скопирована в буфер обмена!');
  };

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : playerMode === 3
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить! 🎮`;

  return (
    <div className="j-overlay" role="dialog" aria-label="Конец игры">
      <div className={`j-card${showQR ? ' j-card--wide' : ''}`}>
        <h1 className="j-heading j-heading--danger">💥 Башня рухнула!</h1>
        {playerMode === 2 && (
          <div className={`j-gameover-result ${playerClass}`}>
            {loser} проиграл!
          </div>
        )}
        {playerMode === 3 && (
          <div className={`j-gameover-result ${playerClass}`}>
            {loser === PLAYER_NAMES[1] ? '🤖 ИИ проиграл! Вы победили!' : 'Вы проиграли! 🤖 ИИ победил!'}
          </div>
        )}
        <div className="j-stats">
          <div className="j-stat">
            <div className="j-stat__val">{turns}</div>
            <div className="j-stat__label">Ходов</div>
          </div>
          <div className="j-stat">
            <div className="j-stat__val">{best}</div>
            <div className="j-stat__label">Лучший</div>
          </div>
          <div className="j-stat">
            <div className="j-stat__val">{total}</div>
            <div className="j-stat__label">Игр</div>
          </div>
        </div>

        {showQR && (
          <div className="j-qr-card">
            <p className="j-qr-card__hint">📱 Отсканируй чтобы играть на телефоне</p>
            <QRCodeDisplay url="https://jenga3d.app" size={120} />
          </div>
        )}

        <div className="j-gameover-actions">
          <button className="j-btn j-btn--primary" aria-label="Играть снова" onClick={onRestart}>🔄 Играть снова</button>
          {!continuedAfterCollapse && onContinueAfterCollapse && (
            <RewardedVideoButton onRewardGranted={onContinueAfterCollapse} />
          )}
          <button
            className="j-btn j-btn--secondary"
            aria-label="Показать QR код"
            onClick={() => setShowQR(!showQR)}
          >
            {showQR ? '✓ QR' : '📱 QR'}
          </button>
          <button
            className="j-btn j-btn--secondary"
            aria-label="Поделиться результатом"
            onClick={handleShare}
          >
            🔗 Поделиться
          </button>
          {replays.length > 0 && (
            <button
              className="j-btn j-btn--secondary"
              aria-label="Просмотреть повторы"
              onClick={() => setShowReplays(!showReplays)}
            >
              {showReplays ? '✓ Повторы' : '▶️ Повторы'}
            </button>
          )}
        </div>

        {showReplays && replays.length > 0 && (
          <div className="j-gameover-replays">
            <h3 className="j-heading j-heading--secondary">Ваши повторы</h3>
            <div className="j-replays-list">
              {replays.map((replay, idx) => (
                <div key={idx} className="j-replay-item">
                  <button
                    className="j-btn j-btn--small"
                    onClick={() => setSelectedReplay(selectedReplay === idx ? null : idx)}
                  >
                    Игра {idx + 1} — {replay.turns} ходов
                  </button>
                  {selectedReplay === idx && (
                    <ReplayPlayer replay={replay} onClose={() => setSelectedReplay(null)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="j-gameover-share">
          <p className="j-gameover-share__hint">Поделись своим результатом! 📱</p>
          <SocialSharePanel
            shareText={shareText}
            shareTitle="Jenga 3D"
            shareUrl="https://jenga3d.app"
          />
        </div>
      </div>
    </div>
  );
}