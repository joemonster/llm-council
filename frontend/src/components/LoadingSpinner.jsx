import { useState, useEffect } from 'react';
import './LoadingSpinner.css';

function LoadingSpinner({ message, showTimer = false, startTime = null, size = 'medium' }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!showTimer) return;

    const start = startTime || Date.now();

    const interval = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [showTimer, startTime]);

  return (
    <div className={`loading-spinner-container size-${size}`}>
      <div className="spinner-wrapper">
        <div className="spinner-ring"></div>
      </div>
      {message && <span className="loading-message">{message}</span>}
      {showTimer && (
        <span className="loading-timer">{elapsed.toFixed(1)}s</span>
      )}
    </div>
  );
}

export default LoadingSpinner;
