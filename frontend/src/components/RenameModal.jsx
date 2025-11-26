import { useState, useEffect } from 'react';
import './ConfirmModal.css';

export default function RenameModal({ isOpen, currentTitle, onConfirm, onCancel }) {
  const [title, setTitle] = useState(currentTitle || '');

  useEffect(() => {
    setTitle(currentTitle || '');
  }, [currentTitle, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onConfirm(title.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Zmień nazwę rozmowy</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="modal-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wprowadź nową nazwę..."
            autoFocus
          />
          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn modal-btn-cancel"
              onClick={onCancel}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="modal-btn modal-btn-confirm"
              disabled={!title.trim()}
            >
              Zmień nazwę
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
