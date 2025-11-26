import { useState } from 'react';
import UserSettingsTab from './UserSettingsTab';
import CouncilConfigTab from './CouncilConfigTab';
import './SettingsModal.css';

function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('user');

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Settings</h2>
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

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => setActiveTab('user')}
          >
            User
          </button>
          <button
            className={`modal-tab ${activeTab === 'council' ? 'active' : ''}`}
            onClick={() => setActiveTab('council')}
          >
            Expert Panel
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'user' && <UserSettingsTab />}
          {activeTab === 'council' && <CouncilConfigTab />}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
