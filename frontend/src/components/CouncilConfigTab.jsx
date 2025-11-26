import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import './CouncilConfigTab.css';

function CouncilConfigTab() {
  const [models, setModels] = useState([]);
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('all'); // 'all', 'free', 'paid'
  const [showModelSelector, setShowModelSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsData, configData] = await Promise.all([
        api.getOpenRouterModels(),
        api.getCouncilConfig(),
      ]);
      setModels(modelsData.models || []);
      setCouncilModels(configData.council_models || []);
      setChairmanModel(configData.chairman_model || '');
    } catch (err) {
      console.error('Failed to load config:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredModels = useMemo(() => {
    let filtered = models;

    // Filter by free/paid
    if (modelFilter === 'free') {
      filtered = filtered.filter(m => m.is_free);
    } else if (modelFilter === 'paid') {
      filtered = filtered.filter(m => !m.is_free);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query)
      );
    }

    // Sort: selected first, then alphabetically
    return filtered.sort((a, b) => {
      const aSelected = councilModels.includes(a.id);
      const bSelected = councilModels.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [models, modelFilter, searchQuery, councilModels]);

  const handleAddModel = (modelId) => {
    if (!councilModels.includes(modelId)) {
      setCouncilModels([...councilModels, modelId]);
    }
    setShowModelSelector(false);
    setSearchQuery('');
  };

  const handleRemoveModel = (modelId) => {
    setCouncilModels(councilModels.filter(id => id !== modelId));
    // If removed model was chairman, clear chairman
    if (chairmanModel === modelId) {
      setChairmanModel('');
    }
  };

  const handleSave = async () => {
    if (councilModels.length === 0) {
      setError('Please select at least one council model');
      return;
    }
    if (!chairmanModel) {
      setError('Please select a chairman model');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.updateCouncilConfig(councilModels, chairmanModel);
      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save config:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getModelById = (modelId) => {
    return models.find(m => m.id === modelId);
  };

  const formatPrice = (price) => {
    if (!price || price === '0') return 'Free';
    const num = parseFloat(price);
    if (num < 0.0001) return `$${(num * 1000000).toFixed(2)}/1M`;
    return `$${num.toFixed(4)}/1K`;
  };

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner" />
        <span>Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="council-config-tab">
      {error && (
        <div className="settings-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      {/* Council Models Section */}
      <div className="settings-section">
        <h3>Council Models</h3>
        <p>Select the models that will participate in the expert panel discussion.</p>

        <div className="selected-models">
          {councilModels.length === 0 ? (
            <div className="no-models">No models selected</div>
          ) : (
            councilModels.map(modelId => {
              const model = getModelById(modelId);
              return (
                <div key={modelId} className="selected-model-chip">
                  <span className="model-name">{model?.name || modelId}</span>
                  {model?.is_free && <span className="free-badge">Free</span>}
                  <button
                    className="remove-model"
                    onClick={() => handleRemoveModel(modelId)}
                    title="Remove model"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>

        <button
          className="add-model-button"
          onClick={() => setShowModelSelector(!showModelSelector)}
        >
          {showModelSelector ? 'Close' : '+ Add Model'}
        </button>

        {showModelSelector && (
          <div className="model-selector">
            <div className="selector-header">
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="model-search"
              />
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${modelFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setModelFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${modelFilter === 'free' ? 'active' : ''}`}
                  onClick={() => setModelFilter('free')}
                >
                  Free
                </button>
                <button
                  className={`filter-btn ${modelFilter === 'paid' ? 'active' : ''}`}
                  onClick={() => setModelFilter('paid')}
                >
                  Paid
                </button>
              </div>
            </div>

            <div className="model-list">
              {filteredModels.map(model => {
                const isSelected = councilModels.includes(model.id);
                return (
                  <div
                    key={model.id}
                    className={`model-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isSelected && handleAddModel(model.id)}
                  >
                    <div className="model-info">
                      <span className="model-name">{model.name}</span>
                      <span className="model-id">{model.id}</span>
                    </div>
                    <div className="model-meta">
                      {model.is_free ? (
                        <span className="free-badge">Free</span>
                      ) : (
                        <span className="price-badge">
                          {formatPrice(model.pricing?.prompt)}
                        </span>
                      )}
                      {model.context_length && (
                        <span className="context-badge">
                          {Math.round(model.context_length / 1000)}K ctx
                        </span>
                      )}
                    </div>
                    {isSelected && <span className="check-mark">✓</span>}
                  </div>
                );
              })}
              {filteredModels.length === 0 && (
                <div className="no-models">No models found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chairman Model Section */}
      <div className="settings-section">
        <h3>Chairman Model</h3>
        <p>Select the model that will synthesize the final response from all council members.</p>

        <select
          className="chairman-select"
          value={chairmanModel}
          onChange={(e) => setChairmanModel(e.target.value)}
        >
          <option value="">Select a chairman model...</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} {model.is_free ? '(Free)' : `(${formatPrice(model.pricing?.prompt)})`}
            </option>
          ))}
        </select>
      </div>

      {/* Save Button */}
      <div className="save-section">
        <button
          className="save-button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export default CouncilConfigTab;
