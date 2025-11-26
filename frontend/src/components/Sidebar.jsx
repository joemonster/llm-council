import './Sidebar.css';
import SkeletonLoader from './SkeletonLoader';
import LoadingSpinner from './LoadingSpinner';

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isLoading = false,
  isCreating = false,
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LLM Council</h1>
        <button
          className="new-conversation-btn"
          onClick={onNewConversation}
          disabled={isCreating}
        >
          {isCreating ? (
            <LoadingSpinner size="small" />
          ) : (
            '+ New Conversation'
          )}
        </button>
      </div>

      <div className="conversation-list">
        {isLoading ? (
          <SkeletonLoader type="conversation-list" count={5} />
        ) : conversations.length === 0 ? (
          <div className="no-conversations">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">
                {conv.title || 'New Conversation'}
              </div>
              <div className="conversation-meta">
                {conv.message_count} messages
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
