// src/App.jsx
import React, { useMemo } from "react";
import "./App.css";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import MemoizedMessageList from "./components/MemoizedMessageList";
import RichTextEditor from "./components/RichTextEditor";
import { useChat } from "./context/useChat";

function App() {
  // Pull everything we need from the global ChatProvider
  const {
    messages,
    isLoading,
    error,
    isCopied,
    handleMessageSubmit,
    // The following are optional UI helpers you may still want:
    // setCopied, setPromptProfiles, etc.
  } = useChat();

  // Keep the copy‑to‑clipboard hook for UI that needs it
  const [copied, copy] = useCopyToClipboard();

  // No local state, no extra provider – just memoise the value we pass down
  const contextValue = useMemo(
    () => ({
      messages,
      isLoading,
      error,
      isCopied: copied,
      copy,
      handleMessageSubmit,
    }),
    [messages, isLoading, error, copied, copy, handleMessageSubmit]
  );

  return (
    <div className="app-container">
      <div className="chat-window">
        <h1 className="chat-header">LLM Test Interface</h1>
        {/* The MessageList and Editor read from the global context */}
        <MemoizedMessageList />
        <RichTextEditor onSubmit={handleMessageSubmit} />
      </div>
      {error && <p className="error-message">Error: {error}</p>}
    </div>
  );
}

export default App;
