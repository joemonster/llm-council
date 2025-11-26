import { useState, useEffect, useRef } from 'react';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import LoadingSpinner from './LoadingSpinner';
import SkeletonLoader from './SkeletonLoader';
import ConfirmModal from './ConfirmModal';
import RenameModal from './RenameModal';
import UserMessage from './UserMessage';
import { api } from '../api';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  onDeleteConversation,
  onRenameConversation,
  isLoading,
  isLoadingConversation = false,
  messageStartTime = null,
}) {
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [config, setConfig] = useState(null);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const cfg = await api.getConfig();
        setConfig(cfg);
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleRenameClick = () => {
    setShowMenu(false);
    setShowRenameModal(true);
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowDeleteModal(true);
  };

  const handleConfirmRename = async (newTitle) => {
    setShowRenameModal(false);
    if (!conversation) return;

    try {
      await api.updateConversationTitle(conversation.id, newTitle);
      // Update the conversation list via parent callback
      if (onRenameConversation) {
        onRenameConversation(conversation.id, newTitle);
      }
    } catch (error) {
      console.error('Failed to rename conversation:', error);
      alert('Nie udało się zmienić nazwy rozmowy. Spróbuj ponownie.');
    }
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (onDeleteConversation && conversation) {
      await onDeleteConversation(conversation.id);
    }
  };

  // No conversation selected
  if (!conversation && !isLoadingConversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state">
          <h2>Witaj w Radzie LLM</h2>
          <p>Utwórz nową rozmowę, aby rozpocząć</p>
        </div>
      </div>
    );
  }

  // Loading conversation
  if (isLoadingConversation) {
    return (
      <div className="chat-interface">
        <div className="messages-container">
          <SkeletonLoader type="messages" />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      {conversation && conversation.messages && (
        <div className="chat-header">
          <h2 className="chat-title">{conversation.title || 'Nowa rozmowa'}</h2>
          <div className="chat-menu" ref={menuRef}>
            <button
              className="menu-button"
              onClick={() => setShowMenu(!showMenu)}
              title="Więcej opcji"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="menu-dropdown">
                <button className="menu-item" onClick={handleRenameClick}>
                  <EditRoundedIcon fontSize="small" />
                  <span>Zmień nazwę</span>
                </button>
                <button className="menu-item menu-item-delete" onClick={handleDeleteClick}>
                  <DeleteRoundedIcon fontSize="small" />
                  <span>Usuń</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="messages-container">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="empty-state">
            <h2>Rozpocznij rozmowę</h2>
            <p>Zadaj pytanie, aby skonsultować się z Radą LLM</p>

            {config && (
              <div className="council-info">
                <h3>Członkowie Rady</h3>
                <ul className="council-models-list">
                  {config.council_models.map((model, index) => (
                    <li key={index} className="council-model-item">
                      <span className="model-icon">🤖</span>
                      <span className="model-name">{model.split('/')[1] || model}</span>
                    </li>
                  ))}
                </ul>
                <div className="chairman-info">
                  <span className="chairman-label">👔 Przewodniczący:</span>
                  <span className="chairman-name">{config.chairman_model.split('/')[1] || config.chairman_model}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          conversation.messages.map((msg, index) => (
            <div key={index} className="message-group">
              {msg.role === 'user' ? (
                <UserMessage content={msg.content} />
              ) : (
                <div className="assistant-message">
                  <div className="message-label">Rada LLM</div>

                  {/* Stage 1 */}
                  {msg.loading?.stage1 && (
                    <div className="stage-loading stage-1-loading">
                      <div className="stage-loading-header">
                        <span className="stage-number">1</span>
                        <span className="stage-name">Zbieranie indywidualnych odpowiedzi</span>
                      </div>
                      <LoadingSpinner
                        message="Odpytywanie 4 modeli rady równolegle..."
                        showTimer={true}
                        startTime={msg.stageStartTime}
                      />
                    </div>
                  )}
                  {msg.stage1 && <Stage1 responses={msg.stage1} />}

                  {/* Stage 2 */}
                  {msg.loading?.stage2 && (
                    <div className="stage-loading stage-2-loading">
                      <div className="stage-loading-header">
                        <span className="stage-number">2</span>
                        <span className="stage-name">Rankingi wzajemne</span>
                      </div>
                      <LoadingSpinner
                        message="Modele oceniają nawzajem swoje odpowiedzi..."
                        showTimer={true}
                        startTime={msg.stageStartTime}
                      />
                    </div>
                  )}
                  {msg.stage2 && (
                    <Stage2
                      rankings={msg.stage2}
                      labelToModel={msg.metadata?.label_to_model}
                      aggregateRankings={msg.metadata?.aggregate_rankings}
                    />
                  )}

                  {/* Stage 3 */}
                  {msg.loading?.stage3 && (
                    <div className="stage-loading stage-3-loading">
                      <div className="stage-loading-header">
                        <span className="stage-number">3</span>
                        <span className="stage-name">Ostateczna synteza</span>
                      </div>
                      <LoadingSpinner
                        message="Przewodniczący syntetyzuje ostateczną odpowiedź..."
                        showTimer={true}
                        startTime={msg.stageStartTime}
                      />
                    </div>
                  )}
                  {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        <textarea
          className="message-input"
          placeholder="Zadaj pytanie... (Shift+Enter dla nowej linii, Enter aby wysłać)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={3}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? <LoadingSpinner size="small" /> : 'Wyślij'}
        </button>
      </form>

      <RenameModal
        isOpen={showRenameModal}
        currentTitle={conversation?.title || 'Nowa rozmowa'}
        onConfirm={handleConfirmRename}
        onCancel={() => setShowRenameModal(false)}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Usuń rozmowę"
        message="Czy na pewno chcesz usunąć tę rozmowę? Ta operacja jest nieodwracalna."
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
