import { useState, useEffect } from 'react';
import { api } from '../api';
import ModelSelectionModal from './ModelSelectionModal';
import './CouncilConfigTab.css';

function CouncilConfigTab() {
  const [models, setModels] = useState([]);
  const [councilModels, setCouncilModels] = useState([]);
  const [chairmanModel, setChairmanModel] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = (modelId) => {
    if (!councilModels.includes(modelId)) {
      setCouncilModels([...councilModels, modelId]);
    }
    setShowModelSelector(false);
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
      setError('Wybierz przynajmniej jeden model rady');
      return;
    }
    if (!chairmanModel) {
      setError('Wybierz model przewodniczącego');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage('');

    try {
      await api.updateCouncilConfig(councilModels, chairmanModel);
      setSuccessMessage('Konfiguracja zapisana pomyślnie!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getModelById = (modelId) => {
    return models.find(m => m.id === modelId);
  };

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

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="spinner" />
        <span>Ładowanie konfiguracji...</span>
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
        <h3>Modele Rady</h3>
        <p>Wybierz modele, które będą uczestniczyć w dyskusji panelu ekspertów.</p>

        <div className="selected-models">
          {councilModels.length === 0 ? (
            <div className="no-models">Nie wybrano modeli</div>
          ) : (
            councilModels.map(modelId => {
              const model = getModelById(modelId);
              return (
                <div key={modelId} className="selected-model-chip">
                  <span className="model-name">{model?.name || modelId}</span>
                  {model?.is_free && <span className="free-badge">Darmowy</span>}
                  <button
                    className="remove-model"
                    onClick={() => handleRemoveModel(modelId)}
                    title="Usuń model"
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
          onClick={() => setShowModelSelector(true)}
        >
          + Dodaj Model
        </button>
      </div>

      {/* Chairman Model Section */}
      <div className="settings-section">
        <h3>Model Przewodniczącego</h3>
        <p>Wybierz model, który zsyntetyzuje ostateczną odpowiedź ze wszystkich członków rady.</p>

        <select
          className="chairman-select"
          value={chairmanModel}
          onChange={(e) => setChairmanModel(e.target.value)}
        >
          <option value="">Wybierz model przewodniczącego...</option>
          {models.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} {model.is_free ? '(Darmowy)' : `(${formatPricing(model.pricing)})`}
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
          {saving ? 'Zapisywanie...' : 'Zapisz Konfigurację'}
        </button>
      </div>

      <ModelSelectionModal
        isOpen={showModelSelector}
        models={models}
        councilModels={councilModels}
        onSelect={handleAddModel}
        onClose={() => setShowModelSelector(false)}
      />
    </div>
  );
}

export default CouncilConfigTab;
