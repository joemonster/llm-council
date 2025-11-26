import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import { api } from './api';
import './App.css';

function MainApp() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [messageStartTime, setMessageStartTime] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when URL changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setCurrentConversation(null);
    }
  }, [conversationId]);

  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversation = async (id) => {
    setIsLoadingConversation(true);
    setCurrentConversation(null);
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleNewConversation = async () => {
    setIsCreatingConversation(true);
    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, title: newConv.title, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      navigate(`/c/${newConv.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleSelectConversation = (id) => {
    navigate(`/c/${id}`);
  };

  const handleRenameConversation = (id, newTitle) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, title: newTitle } : conv
      )
    );

    // Update current conversation if it's the one being renamed
    if (currentConversation?.id === id) {
      setCurrentConversation((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.deleteConversation(id);

      // Remove from conversations list
      setConversations(conversations.filter(conv => conv.id !== id));

      // If this was the current conversation, navigate to home
      if (conversationId === id) {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Nie udało się usunąć rozmowy. Spróbuj ponownie.');
    }
  };

  const handleSendMessage = async (content) => {
    if (!conversationId) return;

    setIsLoading(true);
    const startTime = Date.now();
    setMessageStartTime(startTime);

    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: true,
          stage2: false,
          stage3: false,
        },
        stageStartTime: startTime,
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Stage 1: Collect responses
      console.log('Starting Stage 1...');
      const stage1Result = await api.runStage1(conversationId, content);

      const stage2StartTime = Date.now();
      setCurrentConversation((prev) => {
        const messages = [...prev.messages];
        const lastMsg = messages[messages.length - 1];
        lastMsg.stage1 = stage1Result.stage1;
        lastMsg.loading.stage1 = false;
        lastMsg.loading.stage2 = true;
        lastMsg.stageStartTime = stage2StartTime;
        return { ...prev, messages };
      });

      // Stage 2: Collect rankings
      console.log('Starting Stage 2...');
      const stage2Result = await api.runStage2(
        conversationId,
        content,
        stage1Result.stage1
      );

      const stage3StartTime = Date.now();
      setCurrentConversation((prev) => {
        const messages = [...prev.messages];
        const lastMsg = messages[messages.length - 1];
        lastMsg.stage2 = stage2Result.stage2;
        lastMsg.metadata = stage2Result.metadata;
        lastMsg.loading.stage2 = false;
        lastMsg.loading.stage3 = true;
        lastMsg.stageStartTime = stage3StartTime;
        return { ...prev, messages };
      });

      // Stage 3: Chairman synthesis
      console.log('Starting Stage 3...');
      const stage3Result = await api.runStage3(
        conversationId,
        content,
        stage1Result.stage1,
        stage2Result.stage2,
        stage2Result.metadata
      );

      setCurrentConversation((prev) => {
        const messages = [...prev.messages];
        const lastMsg = messages[messages.length - 1];
        lastMsg.stage3 = stage3Result.stage3;
        lastMsg.loading.stage3 = false;
        lastMsg.stageStartTime = null;
        return { ...prev, messages };
      });

      // Update title if returned (first message)
      if (stage3Result.title) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId
              ? { ...conv, title: stage3Result.title }
              : conv
          )
        );
      }

      // Reload conversations list to get updated title and message count
      loadConversations();

      console.log('All stages complete!');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
    } finally {
      setIsLoading(false);
      setMessageStartTime(null);
    }
  };

  return (
    <div className="app-container">
      <Header onOpenSettings={() => setShowSettingsModal(true)} />
      <div className="app-main">
        <Sidebar
          conversations={conversations}
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isLoading={isLoadingConversations}
          isCreating={isCreatingConversation}
        />
        <ChatInterface
          conversation={currentConversation}
          onSendMessage={handleSendMessage}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isLoading}
          isLoadingConversation={isLoadingConversation}
          messageStartTime={messageStartTime}
        />
      </div>
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainApp />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/c/:conversationId" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
