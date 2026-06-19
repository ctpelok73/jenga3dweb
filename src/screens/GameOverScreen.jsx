import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useModalA11y } from '../hooks/useModalA11y';
import { PLAYER_NAMES } from '../styles';
import { getBestScore, getTotalGames } from '../scoreTracker';
import SocialSharePanel from '../SocialSharePanel';
import QRCodeDisplay from '../QRCodeDisplay';
import RewardedVideoButton from '../RewardedVideoButton';
import ReplayPlayer from '../components/ReplayPlayer';
import { generateShareLink, listGameReplays } from '../shareService';

export default function GameOverScreen({ turns, onRestart, currentPlayer, playerMode, onContinueAfterCollapse, continuedAfterCollapse, gameMode }) {
  const best = getBestScore();
  const total = getTotalGames();
  const isNewRecord = turns >= best && turns > 0;
  const loser = playerMode >= 2 ? PLAYER_NAMES[currentPlayer] : 'Вы';
  const [showQR, setShowQR] = useState(false);
  const [showReplays, setShowReplays] = useState(false);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const replays = useMemo(() => listGameReplays(), []);
  const playerClass = currentPlayer === 0 ? 'j-player--p1' : (currentPlayer === 1 && playerMode === 3 ? 'j-player--ai' : 'j-player--p2');
  const modalRef = useModalA11y();
  const copiedTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(copiedTimerRef.current);
  }, []);

  const handleShare = async () => {
    const link = generateShareLink({
      turns,
      difficulty: 'normal',
    });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        return;
      }
      setLinkCopied(true);
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : playerMode === 3
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить! 🎮`;

  return (
    <div className="j-overlay" role="dialog" aria-label="Конец игры" ref={modalRef}>
      <div className={`j-card${showQR ? ' j-card--wide' : ''}`}>
        <div className="j-gameover-icon">{gameMode === 'speed' ? '⏱' : '💥'}</div>
        <h1 className="j-heading j-heading--danger">{gameMode === 'speed' ? 'Время вышло!' : 'Башня рухнула!'}</h1>
        {gameMode === 'speed' && (
          <div className="j-gameover-result" style={{ color: 'var(--j-purple-light)' }}>Speed Run</div>
        )}
        {isNewRecord && (
          <div className="j-gameover-record">NEW RECORD!</div>
        )}
        {playerMode === 2 && (
          <div className={`j-gameover-result ${playerClass}`}>
            {loser} проиграл!
          </div>
        )}
        {playerMode === 3 && (
          <div className={`j-gameover-result ${playerClass}`}>
            {loser === PLAYER_NAMES[1] ? 'ИИ проиграл! Вы победили!' : 'Вы проиграли! ИИ победил!'}
          </div>
        )}
        <div className="j-gameover-score">{turns}</div>
        <div className="j-gameover-score-label">ходов сделано</div>
        <div className="j-stats">
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
            className={`j-btn j-btn--secondary${linkCopied ? ' j-share-btn--copied' : ''}`}
            aria-label="Поделиться результатом"
            onClick={handleShare}
          >
            {linkCopied ? '✓ Скопировано' : '🔗 Поделиться'}
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
                <div key={replay.id || idx} className="j-replay-item">
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