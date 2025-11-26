import { useState, useMemo } from 'react';
import './ModelSelectionModal.css';

function ModelSelectionModal({ isOpen, models, councilModels, onSelect, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('all'); // 'all', 'free', 'paid'

  const formatPrice = (price) => {
    if (!price || price === '0') return 'Darmowy';
    const num = parseFloat(price);
    const pricePerMillion = num * 1000000;

    // If less than 1 or has decimal parts, show decimals
    if (pricePerMillion < 1 || pricePerMillion % 1 !== 0) {
      return `$${pricePerMillion.toFixed(2)}`;
    }

    return `$${Math.round(pricePerMillion)}`;
  };

  const formatPricing = (pricing) => {
    if (!pricing) return 'Darmowy';
    const promptPrice = pricing.prompt;
    const completionPrice = pricing.completion;

    if ((!promptPrice || promptPrice === '0') && (!completionPrice || completionPrice === '0')) {
      return 'Darmowy';
    }

    return `${formatPrice(promptPrice)} we / ${formatPrice(completionPrice)} wy`;
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container model-selection-modal">
        <div className="modal-header">
          <h2>Wybierz Model</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="model-selector-content">
          <div className="selector-header">
            <input
              type="text"
              placeholder="Szukaj modeli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="model-search"
            />
            <div className="filter-buttons">
              <button
                className={`filter-btn ${modelFilter === 'all' ? 'active' : ''}`}
                onClick={() => setModelFilter('all')}
              >
                Wszystkie
              </button>
              <button
                className={`filter-btn ${modelFilter === 'free' ? 'active' : ''}`}
                onClick={() => setModelFilter('free')}
              >
                Darmowe
              </button>
              <button
                className={`filter-btn ${modelFilter === 'paid' ? 'active' : ''}`}
                onClick={() => setModelFilter('paid')}
              >
                Płatne
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
                  onClick={() => !isSelected && onSelect(model.id)}
                >
                  <div className="model-info">
                    <span className="model-name">{model.name}</span>
                    <span className="model-id">{model.id}</span>
                  </div>
                  <div className="model-meta">
                    {model.is_free ? (
                      <span className="free-badge">Darmowy</span>
                    ) : (
                      <span className="price-badge">
                        {formatPricing(model.pricing)}
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
              <div className="no-models">Nie znaleziono modeli</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelSelectionModal;
