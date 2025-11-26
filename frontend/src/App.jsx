import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';
import './App.css';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [messageStartTime, setMessageStartTime] = useState(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

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
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;

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
      const stage1Result = await api.runStage1(currentConversationId, content);

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
        currentConversationId,
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
        currentConversationId,
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
            conv.id === currentConversationId
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
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isLoading={isLoadingConversations}
        isCreating={isCreatingConversation}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        isLoadingConversation={isLoadingConversation}
        messageStartTime={messageStartTime}
      />
    </div>
  );
}

export default App;
