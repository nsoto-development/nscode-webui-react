// src/App.jsx
import React from "react";
import "./App.css";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import MemoizedMessageList from "./components/MemoizedMessageList";
import RichTextEditor from "./components/RichTextEditor";
import { useChat } from "./context/useChat";

function App() {
  const {
    messages,
    isLoading,
    error,
    handleMessageSubmit,
    resetChat,
  } = useChat();

  const [copied, copy] = useCopyToClipboard();

  return (
    <div className="app-container">
      <div className="chat-window">
        <h1 className="chat-header">LLM Test Interface</h1>

        <MemoizedMessageList />
        <RichTextEditor onSubmit={handleMessageSubmit} />

        {/* ---- Floating Clear‑Chat button ---- */}
        {messages.length > 0 && (
          <button
            type="button"
            className="floating-clear-chat"
            onClick={resetChat}
            title="Clear chat history"
          >
            ✕
          </button>
        )}
      </div>

      {error && <p className="error-message">Error: {error}</p>}
    </div>
  );
}

export default App;
