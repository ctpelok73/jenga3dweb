import React, { useState, useEffect, useRef } from 'react';
import { ReplayPlayer as ReplayPlayerClass } from '../shareService';

export default function ReplayPlayer({ replay, onClose }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!replay) return;

    playerRef.current = new ReplayPlayerClass(replay);

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [replay]);

  const handlePlay = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.stop();
      playerRef.current.play(
        (move) => {
          setProgress(playerRef.current.getProgress().percentage);
        },
        () => {
          setIsPlaying(false);
        }
      );
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (e) => {
    const speed = parseFloat(e.target.value);
    setPlaybackSpeed(speed);
    if (playerRef.current) {
      playerRef.current.setPlaybackSpeed(speed);
    }
  };

  const handleProgressChange = (e) => {
    const percentage = parseFloat(e.target.value);
    const moveIndex = Math.floor((percentage / 100) * replay.moves.length);
    if (playerRef.current) {
      playerRef.current.seekToMove(moveIndex);
      setProgress(percentage);
    }
  };

  if (!replay) return null;

  return (
    <div className="j-replay-player">
      <div className="j-replay-player__header">
        <h3>Просмотр игры</h3>
        <button onClick={onClose} className="j-replay-player__close">✕</button>
      </div>

      <div className="j-replay-player__info">
        <div className="j-replay-player__stat">
          <span className="j-replay-player__label">Ходов:</span>
          <span className="j-replay-player__value">{replay.moves.length}</span>
        </div>
        <div className="j-replay-player__stat">
          <span className="j-replay-player__label">Длительность:</span>
          <span className="j-replay-player__value">
            {Math.floor(replay.duration / 1000)}s
          </span>
        </div>
        <div className="j-replay-player__stat">
          <span className="j-replay-player__label">Сложность:</span>
          <span className="j-replay-player__value">{replay.config?.difficulty ?? '—'}</span>
        </div>
      </div>

      <div className="j-replay-player__controls">
        <button
          onClick={handlePlay}
          className={`j-replay-player__btn ${isPlaying ? 'j-replay-player__btn--pause' : ''}`}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <div className="j-replay-player__progress">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="j-replay-player__slider"
          />
        </div>

        <div className="j-replay-player__speed">
          <select value={playbackSpeed} onChange={handleSpeedChange} className="j-replay-player__speed-select">
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
