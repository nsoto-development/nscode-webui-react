// src/pages/ChatPage.jsx
import React from "react";
import "./../styles/App.css";               // keep the same CSS file (or move it later)
import { useChat } from "../features/chat/hooks/useChat";
import ChatSelector from "../features/chat/ui/ChatSelector";
import MemoizedMessageList from "../features/chat/ui/MemoizedMessageList";
import RichTextEditor from "../features/chat/ui/RichTextEditor";
import { useCopyToClipboard } from "../features/chat/hooks/useCopyToClipboard";

export default function ChatPage() {
  const {
    error,
    handleMessageSubmit,
    resetChat,
    isLoading,
  } = useChat();

  const [copied, copy] = useCopyToClipboard();

  return (
    <div className="app-container">
      <div className="chat-window">
        <h1 className="chat-header">LLM Test Interface</h1>

        <ChatSelector />
        <MemoizedMessageList />
        <RichTextEditor onSubmit={handleMessageSubmit} />

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