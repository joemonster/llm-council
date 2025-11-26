import './SkeletonLoader.css';

function SkeletonLoader({ type, count = 5 }) {
  if (type === 'conversation-list') {
    return (
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton-item">
            <div className="skeleton-line skeleton-title"></div>
            <div className="skeleton-line skeleton-subtitle"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'messages') {
    return (
      <div className="skeleton-messages">
        <div className="skeleton-message skeleton-user">
          <div className="skeleton-line skeleton-text-short"></div>
        </div>
        <div className="skeleton-message skeleton-assistant">
          <div className="skeleton-line skeleton-text-long"></div>
          <div className="skeleton-line skeleton-text-medium"></div>
          <div className="skeleton-line skeleton-text-long"></div>
        </div>
      </div>
    );
  }

  if (type === 'stage') {
    return (
      <div className="skeleton-stage">
        <div className="skeleton-tabs">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-tab"></div>
          ))}
        </div>
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-text-long"></div>
          <div className="skeleton-line skeleton-text-medium"></div>
          <div className="skeleton-line skeleton-text-long"></div>
          <div className="skeleton-line skeleton-text-short"></div>
        </div>
      </div>
    );
  }

  return null;
}

export default SkeletonLoader;
