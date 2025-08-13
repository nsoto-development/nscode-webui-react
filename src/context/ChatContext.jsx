// src/context/ChatContext.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { localStorageStore } from "../store/localStorageStore";
// Uncomment when you enable the Cosmos emulator
// import { cosmosStore } from "../store/cosmosStore";

/* -------------------------------------------------
   Choose which store to use – controlled by env flag
   ------------------------------------------------- */
const store =
  import.meta.env.VITE_USE_COSMOSDB === "true" && cosmosStore
    ? cosmosStore
    : localStorageStore;

export const ChatContext = createContext();

/* -------------------------------------------------
   0️⃣ Migration from the old single‑chat storage
   ------------------------------------------------- */
const LEGACY_KEY = "nscode-chat-messages"; // old key
const NEW_KEY = "nscode-multi-chats";      // new key

async function migrateLegacyIfNeeded() {
  if (localStorage.getItem(NEW_KEY)) return; // already migrated
  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  if (!legacyRaw) return;

  try {
    const legacyMessages = JSON.parse(legacyRaw);
    if (!Array.isArray(legacyMessages)) return;

    const tempId = "legacy-chat-" + Date.now();
    const migratedChat = {
      meta: {
        id: tempId,
        title: "Legacy chat",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      messages: legacyMessages,
    };
    const map = { [tempId]: migratedChat };
    localStorage.setItem(NEW_KEY, JSON.stringify(map));
    localStorage.removeItem(LEGACY_KEY);
    console.info("[Chat] Legacy messages migrated to multi‑chat format.");
  } catch (e) {
    console.warn("[Chat] Failed to migrate legacy messages:", e);
  }
}

/* -------------------------------------------------
   ChatProvider – now handles many chats
   ------------------------------------------------- */
export const ChatProvider = ({ children }) => {
  /* ---- Run migration + load chats (single effect, guaranteed order) ---- */
  useEffect(() => {
    (async () => {
      await migrateLegacyIfNeeded();
      setLoading(true);
      try {
        const map = await store.loadChats();
        setChats(map);
        const ids = Object.keys(map);
        if (ids.length) {
          const latest = ids.reduce((a, b) =>
            map[a].meta.updatedAt > map[b].meta.updatedAt ? a : b
          );
          setActiveChatId(latest);
        } else {
          const fresh = store.createEmptyChat();
          setChats({ [fresh.meta.id]: fresh });
          setActiveChatId(fresh.meta.id);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // runs once

  /* ---- State ---- */
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---- Helper to persist a single chat ---- */
  const persistChat = useCallback(
    async (chat) => {
      try {
        await store.saveChat(chat);
        setChats((prev) => ({ ...prev, [chat.meta.id]: chat }));
      } catch (e) {
        setError(e.message);
      }
    },
    [store] // store is constant but added for completeness
  );

  /* -------------------------------------------------
     1️⃣ Core: submit a user message to the LLM endpoint
     ------------------------------------------------- */
  const DEFAULT_PROFILE = {
    systemPrompt: "",
    max_output_tokens: 0,
    temperature: 0,
  };
  const agentApiUrl = import.meta.env.VITE_NSCODE_AGENT_ENDPOINT;

  const handleMessageSubmit = useCallback(
    async (input) => {
      if (!input?.trim() || !activeChatId) return;

      setLoading(true);
      setError(null);

      const userMsg = { role: "user", content: input };
      const chat = chats[activeChatId];

      // Optimistically add user message
      const chatWithUser = {
        ...chat,
        messages: [...chat.messages, userMsg],
        meta: { ...chat.meta, updatedAt: Date.now() },
      };
      await persistChat(chatWithUser);

      // Build payload for LLM
      const payload = [
        { role: "system", content: DEFAULT_PROFILE.systemPrompt },
        ...chatWithUser.messages,
      ];

      try {
        const res = await fetch(agentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "test-model",
            messages: payload,
            max_tokens: DEFAULT_PROFILE.max_output_tokens,
            temperature: DEFAULT_PROFILE.temperature,
          }),
        });

        if (!res.ok) throw new Error(`HTTP error! Status ${res.status}`);

        const data = await res.json();
        const assistantMsg = data.choices?.[0]?.message ?? {
          role: "assistant",
          content: "[No response]",
        };

        const chatWithAssistant = {
          ...chatWithUser,
          messages: [...chatWithUser.messages, assistantMsg],
          meta: { ...chatWithUser.meta, updatedAt: Date.now() },
        };
        await persistChat(chatWithAssistant);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [agentApiUrl, activeChatId, chats, persistChat]
  );

  /* -------------------------------------------------
     2️⃣ Helper: clear only the active chat
     ------------------------------------------------- */
  const resetChat = useCallback(async () => {
    if (!activeChatId) return;
    const empty = {
      ...chats[activeChatId],
      messages: [],
      meta: { ...chats[activeChatId].meta, updatedAt: Date.now() },
    };
    await persistChat(empty);
  }, [activeChatId, chats, persistChat]);

  /* -------------------------------------------------
     3️⃣ Chat management actions
     ------------------------------------------------- */
  const createChat = useCallback(
    async (title = "New chat") => {
      const newChat = store.createEmptyChat(title);
      await persistChat(newChat);
      setActiveChatId(newChat.meta.id);
    },
    [persistChat, store]
  );

  const deleteChat = useCallback(
    async (chatId) => {
      try {
        await store.deleteChat(chatId);
        setChats((prev) => {
          const copy = { ...prev };
          delete copy[chatId];
          return copy;
        });
        if (activeChatId === chatId) {
          const remaining = Object.keys(chats).filter((id) => id !== chatId);
          setActiveChatId(remaining[0] || null);
        }
      } catch (e) {
        setError(e.message);
      }
    },
    [activeChatId, chats, store]
  );

  /* -------------------------------------------------
     4️⃣ Value exposed to UI
     ------------------------------------------------- */
  const value = useMemo(
    () => ({
      chats,
      activeChatId,
      messages: activeChatId ? chats[activeChatId]?.messages || [] : [],
      isLoading,
      error,
      handleMessageSubmit,
      resetChat,
      createChat,
      deleteChat,
      setActiveChatId,
    }),
    [
      chats,
      activeChatId,
      isLoading,
      error,
      handleMessageSubmit,
      resetChat,
      createChat,
      deleteChat,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
