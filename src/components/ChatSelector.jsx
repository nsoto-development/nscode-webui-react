// src/components/ChatSelector.jsx
import React from "react";
import { useChat } from "../context/useChat";

export default function ChatSelector() {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    createChat,
    deleteChat,
  } = useChat();

  const handleNew = () => {
    const title = prompt("Enter a name for the new chat:", "New chat");
    if (title) createChat(title);
  };

  const handleDelete = () => {
    if (!activeChatId) return;
    if (window.confirm("Delete this chat? This cannot be undone.")) {
      deleteChat(activeChatId);
    }
  };

  return (
    <div className="chat-selector">
      <select
        value={activeChatId || ""}
        onChange={(e) => setActiveChatId(e.target.value)}
      >
        {Object.values(chats).map((c) => (
          <option key={c.meta.id} value={c.meta.id}>
            {c.meta.title || `Chat ${c.meta.id.slice(0, 6)}`}
          </option>
        ))}
      </select>
      <button onClick={handleNew}>+ New</button>
      {activeChatId && (
        <button onClick={handleDelete} title="Delete current chat">
          🗑️
        </button>
      )}
    </div>
  );
}
