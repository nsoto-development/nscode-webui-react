import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';
import MemoizedMessageList from './components/MemoizedMessageList';
import RichTextEditor from './components/RichTextEditor';
import { ChatContext } from './context/ChatContext';


const defaultProfile = {
  systemPrompt: "",
  max_output_tokens: 0,
  temperature: 0
};

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCopied, copy] = useCopyToClipboard();
  const [promptProfiles, setPromptProfiles] = useState(null);
  const agentApiUrl = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT;

  const handleMessageSubmit = useCallback(async (input) => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    let activeProfile = defaultProfile;
    if (promptProfiles) {
      for (const profile of promptProfiles) {
        const triggers = profile.when_it_fires.split(/[–—,;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
        if (triggers.some(trigger => userMessage.content.toLowerCase().includes(trigger)) || profile.intent.toLowerCase() === "standard") {
          activeProfile = {
            systemPrompt: profile.system_prompt,
            max_output_tokens: profile.max_output_tokens,
            temperature: profile.temperature
          };
          break;
        }
      }
    }

    try {
      const messagesWithSystemPrompt = [{ role: 'system', content: activeProfile.systemPrompt }, ...newMessages];

      const res = await fetch(agentApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "test-model",
          messages: messagesWithSystemPrompt,
          max_tokens: activeProfile.max_output_tokens,
          temperature: activeProfile.temperature,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage = data.choices[0].message;
      setMessages([...newMessages, assistantMessage]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [messages, setLoading, setError, setPromptProfiles, agentApiUrl, promptProfiles, defaultProfile]);

  const contextValue = useMemo(() => ({
    messages,
    isLoading,
    isCopied,
    copy,
    error,
    handleMessageSubmit,
  }), [messages, isLoading, isCopied, copy, error, handleMessageSubmit]);

  return (
    <ChatContext.Provider value={contextValue}>
      <div className="app-container">
        <div className="chat-window">
          <h1 className="chat-header">LLM Test Interface</h1>
          <MemoizedMessageList />
          <RichTextEditor />
        </div>
        {error && <p className="error-message">Error: {error}</p>}
      </div>
    </ChatContext.Provider>
  );
}

export default App;