// src/features/chat/hooks/useChat.js
import { useContext } from "react";
import { ChatContext } from "../../../app/providers/ChatProvider.jsx";

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};
