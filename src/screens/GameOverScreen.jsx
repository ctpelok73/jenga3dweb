import React, { useState } from 'react';
import { screenStyles, baseStyles, PLAYER_COLORS, PLAYER_NAMES } from '../styles';
import { getBestScore, getTotalGames } from '../scoreTracker';
import SocialSharePanel from '../SocialSharePanel';
import QRCodeDisplay from '../QRCodeDisplay';
import RewardedVideoButton from '../RewardedVideoButton';

export default function GameOverScreen({ turns, onRestart, currentPlayer, playerMode, onContinueAfterCollapse, continuedAfterCollapse }) {
  const best = getBestScore();
  const total = getTotalGames();
  const loser = playerMode === 2 ? PLAYER_NAMES[currentPlayer] : playerMode === 3 ? PLAYER_NAMES[currentPlayer] : 'Вы';
  const [showQR, setShowQR] = useState(false);

  const shareText = playerMode === 2
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : playerMode === 3
    ? `🧱 Jenga 3D — ${loser} уронил башню на ходу ${turns}! Мой лучший: ${best} ходов.`
    : `🧱 Jenga 3D — башня рухнула после ${turns} ходов! Мой лучший: ${best}. Попробуй побить! 🎮`;

  return (
    <div style={screenStyles.container} role="dialog" aria-label="Конец игры">
      <div style={{ ...screenStyles.card, maxWidth: showQR ? 420 : 380 }}>
        <h1 style={{ ...screenStyles.heading, color: '#ff4444' }}>💥 Башня рухнула!</h1>
        {playerMode === 2 && (
          <p style={{ fontSize: 16, color: PLAYER_COLORS[currentPlayer], marginBottom: 12, fontWeight: 'bold' }}>
            {loser} проиграл!
          </p>
        )}
        {playerMode === 3 && (
          <p style={{ fontSize: 16, color: PLAYER_COLORS[currentPlayer], marginBottom: 12, fontWeight: 'bold' }}>
            {loser === PLAYER_NAMES[1] ? '🤖 ИИ проиграл! Вы победили!' : 'Вы проиграли! 🤖 ИИ победил!'}
          </p>
        )}
        <div style={screenStyles.statRow}>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{turns}</div>
            <div style={screenStyles.statLabel}>Ходов сделано</div>
          </div>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{best}</div>
            <div style={screenStyles.statLabel}>Лучший результат</div>
          </div>
          <div style={screenStyles.statItem}>
            <div style={screenStyles.statValue}>{total}</div>
            <div style={screenStyles.statLabel}>Игр сыграно</div>
          </div>
        </div>

        {showQR && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: 12, borderRadius: 8, marginBottom: 12,
            textAlign: 'center',
            border: '1px solid rgba(42,110,255,0.3)'
          }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              📱 Отсканируй чтобы играть на телефоне
            </p>
            <QRCodeDisplay url="https://jenga3d.app" size={120} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <button aria-label="Играть снова" style={baseStyles.btn} onClick={onRestart}>🔄 Играть снова</button>
          {!continuedAfterCollapse && onContinueAfterCollapse && (
            <RewardedVideoButton
              onRewardGranted={onContinueAfterCollapse}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                fontSize: 14, cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s',
              }}
            />
          )}
          <button
            aria-label="Показать QR код"
            style={{ ...baseStyles.btnSecondary, color: '#2a6eff' }}
            onClick={() => setShowQR(!showQR)}
          >
            {showQR ? '✓ QR' : '📱 QR'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 8, textAlign: 'center' }}>
            Поделись своим результатом! 📱
          </p>
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