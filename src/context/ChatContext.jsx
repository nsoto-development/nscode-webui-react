// src/context/ChatContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

export const ChatContext = createContext();

const STORAGE_KEY = "nscode-chat-messages";
const isBrowser = typeof window !== "undefined";

/** Single source of truth for the chat UI. */
export const ChatProvider = ({ children }) => {
  // -----------------------------------------------------------------
  // 1️⃣ State + persistence
  // -----------------------------------------------------------------
  const [messages, setMessages] = useState(() => {
    if (!isBrowser) return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn("Failed to parse chat messages from localStorage", e);
      return [];
    }
  });

  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const agentApiUrl = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT;

  // Persist messages on every change
  useEffect(() => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to write chat messages to localStorage", e);
    }
  }, [messages]);

  // -----------------------------------------------------------------
  // 2️⃣ Helper: reset / clear chat
  // -----------------------------------------------------------------
  const resetChat = useCallback(() => {
    setMessages([]);
    if (isBrowser) localStorage.removeItem(STORAGE_KEY);
  }, []);

  // -----------------------------------------------------------------
  // 3️⃣ Core: submit a user message to the LLM endpoint
  // -----------------------------------------------------------------
  const DEFAULT_PROFILE = {
    systemPrompt: "",
    max_output_tokens: 0,
    temperature: 0,
  };

  const handleMessageSubmit = useCallback(
    async (input) => {
      if (!input?.trim()) return;

      setLoading(true);
      setError(null);

      const userMessage = { role: "user", content: input };

      // Append the user message – functional update avoids stale closure
      setMessages((prev) => [...prev, userMessage]);

      // No prompt‑profile logic needed – always use the default profile
      const activeProfile = DEFAULT_PROFILE;

      try {
        const messagesWithSystemPrompt = [
          { role: "system", content: activeProfile.systemPrompt },
          // Use the latest snapshot of messages (including the user message we just added)
          ...[...messages, userMessage],
        ];

        const res = await fetch(agentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        // Append the assistant reply – functional update again
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [agentApiUrl, messages] // only deps we really need
  );

  // -----------------------------------------------------------------
  // 4️⃣ Provider value (memoised for performance)
  // -----------------------------------------------------------------
  const value = useMemo(
    () => ({
      messages,
      setMessages,
      isLoading,
      error,
      handleMessageSubmit,
      resetChat,
    }),
    [messages, isLoading, error, handleMessageSubmit, resetChat]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
