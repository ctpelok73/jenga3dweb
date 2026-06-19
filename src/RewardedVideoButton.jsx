/**
 * RewardedVideoButton.jsx — «Продолжить после падения» button
 *
 * Appears on GameOverScreen alongside "Играть снова"
 * On click: showRewardedVideo → on reward granted → freeze fallen blocks + continue
 * Shows loading state while video is playing
 */

import React, { useState, useRef, useEffect } from 'react';
import { showRewardedVideo, isAdFree } from './adService';

export default function RewardedVideoButton({ onRewardGranted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorTimerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(errorTimerRef.current);
  }, []);

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
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => setError(null), 3000);
      }
    );
  };

  // If ad-free, show a simple "Continue" button without ad requirement
  if (isAdFree()) {
    return (
      <button
        aria-label="Продолжить игру"
        className="j-reward-btn j-reward-btn--free"
        onClick={onRewardGranted}
      >
        🔄 Продолжить
      </button>
    );
  }

  return (
    <div className="j-flex-col-center">
      <button
        aria-label="Продолжить игру (просмотр рекламы)"
        className="j-reward-btn j-reward-btn--ad"
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? '⏳ Загрузка видео...' : '▶ Продолжить (ad)'}
      </button>
      {error && (
        <div className="j-reward-error">{error}</div>
      )}
    </div>
  );
}