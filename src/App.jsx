// src/App.jsx
import React from "react";
import "./App.css";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import MemoizedMessageList from "./components/MemoizedMessageList";
import RichTextEditor from "./components/RichTextEditor";
import ChatSelector from "./components/ChatSelector";
import { useChat } from "./context/useChat";

function App() {
  const {
    error,
    handleMessageSubmit,
    resetChat, // clears only the active chat
  } = useChat();

  // copy‑to‑clipboard hook (kept for any UI that needs it)
  const [copied, copy] = useCopyToClipboard();

  return (
    <div className="app-container">
      <div className="chat-window">
        <h1 className="chat-header">LLM Test Interface</h1>

        {/* NEW – chat selector */}
        <ChatSelector />

        {/* Message list and editor read from the global context */}
        <MemoizedMessageList />
        <RichTextEditor onSubmit={handleMessageSubmit} />

        {/* Clear‑Chat button – clears only the currently selected chat */}
          <button
            type="button"
            className="floating-clear-chat"
            onClick={resetChat}
            title="Clear chat history"
            disabled={copied}
          >
            ✕
          </button>
      </div>

      {error && <p className="error-message">Error: {error}</p>}
    </div>
  );
}

export default App;
