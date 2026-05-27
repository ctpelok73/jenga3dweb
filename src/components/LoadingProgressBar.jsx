import React, { useEffect, useState } from 'react';

export default function LoadingProgressBar({ isLoading = true, progress = 0 }) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setDisplayProgress(100);
      return;
    }
    setDisplayProgress(progress);
  }, [progress, isLoading]);

  if (!isLoading && displayProgress === 100) {
    return null;
  }

  return (
    <div className="j-loading-overlay">
      <div className="j-loading-container">
        <div className="j-loading-spinner">
          <div className="j-spinner-ring"></div>
          <div className="j-spinner-ring"></div>
          <div className="j-spinner-ring"></div>
        </div>
        <div className="j-loading-text">Загрузка игры...</div>
        <div className="j-progress-bar-container">
          <div
            className="j-progress-bar-fill"
            style={{ width: `${displayProgress}%` }}
          ></div>
        </div>
        <div className="j-progress-text">{Math.round(displayProgress)}%</div>
      </div>
    </div>
  );
}
