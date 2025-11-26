import { useState, useRef, useEffect } from 'react';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import './Sidebar.css';
import SkeletonLoader from './SkeletonLoader';
import LoadingSpinner from './LoadingSpinner';
import ConfirmModal from './ConfirmModal';
import RenameModal from './RenameModal';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isLoading = false,
  isCreating = false,
}) {
  const [showMenu, setShowMenu] = useState(null); // Track which conversation's menu is open
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const buttonRefs = useRef({});

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(null);
      }
    };

    if (showMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleRenameClick = (conv) => {
    setSelectedConversation(conv);
    setShowMenu(null);
    setShowRenameModal(true);
  };

  const handleDeleteClick = (conv) => {
    setSelectedConversation(conv);
    setShowMenu(null);
    setShowDeleteModal(true);
  };

  const handleConfirmRename = async (newTitle) => {
    setShowRenameModal(false);
    if (selectedConversation && onRenameConversation) {
      await onRenameConversation(selectedConversation.id, newTitle);
    }
    setSelectedConversation(null);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false);
    if (selectedConversation && onDeleteConversation) {
      await onDeleteConversation(selectedConversation.id);
    }
    setSelectedConversation(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Rada LLM</h1>
        <button
          className="new-conversation-btn"
          onClick={onNewConversation}
          disabled={isCreating}
        >
          {isCreating ? (
            <LoadingSpinner size="small" />
          ) : (
            '+ Nowa rozmowa'
          )}
        </button>
      </div>

      <div className="conversation-list">
        {isLoading ? (
          <SkeletonLoader type="conversation-list" count={5} />
        ) : conversations.length === 0 ? (
          <div className="no-conversations">Brak rozmów</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
            >
              <div
                className="conversation-content"
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="conversation-title">
                  {conv.title || 'Nowa rozmowa'}
                </div>
                <div className="conversation-meta">
                  {conv.message_count} {conv.message_count === 1 ? 'wiadomość' : conv.message_count < 5 ? 'wiadomości' : 'wiadomości'}
                </div>
              </div>

              <div className="conversation-menu">
                <button
                  ref={(el) => (buttonRefs.current[conv.id] = el)}
                  className="conversation-menu-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showMenu === conv.id) {
                      setShowMenu(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.left,
                      });
                      setShowMenu(conv.id);
                    }
                  }}
                  title="Więcej opcji"
                >
                  <MoreVertIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="conversation-menu-dropdown"
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          <button
            className="conversation-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              const conv = conversations.find((c) => c.id === showMenu);
              if (conv) handleRenameClick(conv);
            }}
          >
            <EditRoundedIcon fontSize="small" />
            <span>Zmień nazwę</span>
          </button>
          <button
            className="conversation-menu-item conversation-menu-item-delete"
            onClick={(e) => {
              e.stopPropagation();
              const conv = conversations.find((c) => c.id === showMenu);
              if (conv) handleDeleteClick(conv);
            }}
          >
            <DeleteRoundedIcon fontSize="small" />
            <span>Usuń</span>
          </button>
        </div>
      )}

      <RenameModal
        isOpen={showRenameModal}
        currentTitle={selectedConversation?.title || 'Nowa rozmowa'}
        onConfirm={handleConfirmRename}
        onCancel={() => {
          setShowRenameModal(false);
          setSelectedConversation(null);
        }}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Usuń rozmowę"
        message={`Czy na pewno chcesz usunąć rozmowę "${selectedConversation?.title || 'Nowa rozmowa'}"? Ta operacja jest nieodwracalna.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedConversation(null);
        }}
      />
    </div>
  );
}
