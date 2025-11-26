import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';

function UserSettingsTab() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [creditsError, setCreditsError] = useState(null);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    setCreditsLoading(true);
    setCreditsError(null);
    try {
      const data = await api.getOpenRouterCredits();
      setCredits(data);
    } catch (error) {
      setCreditsError(error.message);
    } finally {
      setCreditsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatCredits = (value) => {
    if (value === null || value === undefined) return '$0.00';
    return `$${value.toFixed(2)}`;
  };

  const getProgressClass = (percentageUsed) => {
    if (percentageUsed >= 90) return 'critical';
    if (percentageUsed >= 70) return 'low';
    return '';
  };

  return (
    <div className="user-settings-tab">
      {/* User Info Section */}
      <div className="settings-section">
        <h3>Informacje o koncie</h3>
        <div className="settings-row">
          <span className="settings-label">Nazwa użytkownika</span>
          <span className="settings-value">{user?.username}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Wyświetlana nazwa</span>
          <span className="settings-value">{user?.display_name || user?.username}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Członek od</span>
          <span className="settings-value">{formatDate(user?.created_at)}</span>
        </div>
        <div className="settings-row">
          <span className="settings-label">Ostatnie logowanie</span>
          <span className="settings-value">{formatDate(user?.last_login)}</span>
        </div>
      </div>

      {/* Credits Section */}
      <div className="settings-section">
        <h3>Kredyty OpenRouter</h3>

        {creditsLoading && (
          <div className="settings-loading">
            <div className="spinner" />
            <span>Ładowanie kredytów...</span>
          </div>
        )}

        {creditsError && (
          <div className="settings-error">
            Nie udało się załadować kredytów: {creditsError}
            <button
              onClick={loadCredits}
              style={{
                marginLeft: 12,
                padding: '4px 12px',
                cursor: 'pointer',
                border: '1px solid #dc2626',
                borderRadius: 4,
                background: 'transparent',
                color: '#dc2626'
              }}
            >
              Ponów
            </button>
          </div>
        )}

        {!creditsLoading && !creditsError && credits && (
          <div className="credits-display">
            <div className="credits-amount">
              {formatCredits(credits.remaining)}
              <span style={{ fontSize: 14, fontWeight: 400, color: '#666', marginLeft: 8 }}>
                pozostało
              </span>
            </div>

            <div className="credits-progress">
              <div
                className={`credits-progress-bar ${getProgressClass(credits.percentage_used)}`}
                style={{ width: `${Math.max(0, 100 - credits.percentage_used)}%` }}
              />
            </div>

            <div className="credits-details">
              Wykorzystano: {formatCredits(credits.total_usage)} z {formatCredits(credits.total_credits)}
              {credits.percentage_used > 0 && (
                <span> ({credits.percentage_used.toFixed(1)}% użyte)</span>
              )}
            </div>

            <a
              href="https://openrouter.ai/credits"
              target="_blank"
              rel="noopener noreferrer"
              className="credits-link"
            >
              Dodaj więcej kredytów w OpenRouter
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserSettingsTab;
