// src/context/useChat.js
import { useContext } from "react";
import { ChatContext } from "./ChatContext.jsx";

/**
 * Small wrapper that throws a clear error if a component tries to
 * consume the context outside of <ChatProvider>.
 */
export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return ctx;
};
