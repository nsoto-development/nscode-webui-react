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

/**
 * ChatProvider – the single source of truth for the chat UI.
 * It:
 *   • loads / saves `messages` from localStorage,
 *   • holds loading / error state,
 *   • exposes the `handleMessageSubmit` function (the API call you already had in App.jsx),
 *   • provides a `resetChat` helper.
 */
export const ChatProvider = ({ children }) => {
  // -----------------------------------------------------------------
  // 1️⃣  State + persistence
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
  const [isCopied, setCopied] = useState(false); // optional UI flag
  const [promptProfiles, setPromptProfiles] = useState(null);

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
  // 2️⃣  Helper: reset / clear chat
  // -----------------------------------------------------------------
  const resetChat = useCallback(() => {
    setMessages([]);
    if (isBrowser) localStorage.removeItem(STORAGE_KEY);
  }, []);

  // -----------------------------------------------------------------
  // 3️⃣  Core: submit a user message to the LLM endpoint
  // -----------------------------------------------------------------
  const defaultProfile = {
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
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      // ---- decide which profile to use ---------------------------------
      let activeProfile = defaultProfile;
      if (promptProfiles) {
        for (const profile of promptProfiles) {
          const triggers = profile.when_it_fires
            .split(/[–—,;]/)
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
          if (
            triggers.some((t) =>
              userMessage.content.toLowerCase().includes(t)
            ) || profile.intent.toLowerCase() === "standard"
          ) {
            activeProfile = {
              systemPrompt: profile.system_prompt,
              max_output_tokens: profile.max_output_tokens,
              temperature: profile.temperature,
            };
            break;
          }
        }
      }

      // ---- call the backend -------------------------------------------
      try {
        const messagesWithSystemPrompt = [
          { role: "system", content: activeProfile.systemPrompt },
          ...newMessages,
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
        setMessages([...newMessages, assistantMessage]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [
      messages,
      setLoading,
      setError,
      agentApiUrl,
      promptProfiles,
      defaultProfile,
    ]
  );

  // -----------------------------------------------------------------
  // 4️⃣  Provider value (memoised for performance)
  // -----------------------------------------------------------------
  const value = useMemo(
    () => ({
      messages,
      setMessages,
      isLoading,
      error,
      isCopied,
      setCopied,
      promptProfiles,
      setPromptProfiles,
      handleMessageSubmit,
      resetChat,
    }),
    [
      messages,
      isLoading,
      error,
      isCopied,
      promptProfiles,
      handleMessageSubmit,
      resetChat,
    ]
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
};
