/**
 * RewardedVideoButton.jsx — «Продолжить после падения» button
 *
 * Appears on GameOverScreen alongside "Играть снова"
 * On click: showRewardedVideo → on reward granted → freeze fallen blocks + continue
 * Shows loading state while video is playing
 */

import React, { useState } from 'react';
import { showRewardedVideo, isAdFree } from './adService';

export default function RewardedVideoButton({ onRewardGranted, style }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    showRewardedVideo(
      // onReward — video completed, grant the reward
      () => {
        setLoading(false);
        if (onRewardGranted) onRewardGranted();
      },
      // onError — video failed or user skipped
      (reason) => {
        setLoading(false);
        if (reason === 'video_closed') {
          setError('Видео не просмотрено полностью');
        } else {
          setError('Ошибка загрузки рекламы');
        }
        // Auto-clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      }
    );
  };

  // If ad-free, show a simple "Continue" button without ad requirement
  if (isAdFree()) {
    return (
      <button
        aria-label="Продолжить игру"
        style={{
          ...style,
          background: '#44ff88',
          color: '#000',
        }}
        onClick={onRewardGranted}
      >
        🔄 Продолжить
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button
        aria-label="Продолжить игру (просмотр рекламы)"
        style={{
          ...style,
          background: loading ? '#555' : '#ff8800',
          color: loading ? '#999' : '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          minWidth: 160,
        }}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? '⏳ Загрузка видео...' : '▶ Продолжить (ad)'}
      </button>
      {error && (
        <div style={{
          fontSize: 12,
          color: '#ff6666',
          background: 'rgba(255,0,0,0.1)',
          padding: '4px 12px',
          borderRadius: 6,
          border: '1px solid rgba(255,0,0,0.2)',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}