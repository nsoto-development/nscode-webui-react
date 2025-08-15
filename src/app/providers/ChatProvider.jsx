// src/app/providers/ChatProvider.jsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { chatServiceFactory } from "../../features/chat/services/chatService";
import { chatRepositoryFactory } from "../../features/chat/services/chatRepository";

import { localStorageStore } from "../../infrastructure/storage/localStorageStore";
import { cosmosStore } from "../../infrastructure/storage/cosmosStore";

/* -------------------------------------------------
   Export the context – UI components will consume it
   via the feature‑scoped `useChat` hook.
   ------------------------------------------------- */
export const ChatContext = createContext(null);

/* -------------------------------------------------
   ChatProvider – DI container + UI state
   ------------------------------------------------- */
export const ChatProvider = ({ children }) => {
  /* ---------- 0️⃣ Choose storage (env flag) ---------- */
  const store =
    import.meta.env.VITE_USE_COSMOSDB === "true" && cosmosStore
      ? cosmosStore
      : localStorageStore;

  /* ---------- 1️⃣ Build repository + service (DI) ---------- */
  const repository = useMemo(() => chatRepositoryFactory(store), [store]);
  const chatService = useMemo(() => chatServiceFactory(repository), [repository]);

  /* ---------- 2️⃣ UI state (same as old ChatContext) ---------- */
  const [chats, setChats] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------- 3️⃣ Legacy migration (unchanged) ---------- */
  const LEGACY_KEY = "nscode-chat-messages";
  const NEW_KEY = "nscode-multi-chats";

  async function migrateLegacyIfNeeded() {
    if (localStorage.getItem(NEW_KEY)) return;
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

  /* ---------- 4️⃣ Load chats on mount (migration runs first) ---------- */
  useEffect(() => {
    (async () => {
      await migrateLegacyIfNeeded();
      setLoading(true);
      try {
        const map = await repository.loadChats();
        setChats(map);
        const ids = Object.keys(map);
        if (ids.length) {
          const latest = ids.reduce((a, b) =>
            map[a].meta.updatedAt > map[b].meta.updatedAt ? a : b
          );
          setActiveChatId(latest);
        } else {
          const fresh = repository.createEmptyChat();
          setChats({ [fresh.meta.id]: fresh });
          setActiveChatId(fresh.meta.id);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [repository]);

  /* ---------- 5️⃣ Helper – persist a single chat (optimistic UI) ---------- */
  const persistChat = useCallback(
    async (chat) => {
      try {
        await repository.saveChat(chat);
        setChats((prev) => ({ ...prev, [chat.meta.id]: chat }));
      } catch (e) {
        setError(e.message);
      }
    },
    [repository]
  );

  /* ---------- 6️⃣ Action helpers (now delegate to chatService) ---------- */
  const handleMessageSubmit = useCallback(
    async (input) => {
      if (!input?.trim() || !activeChatId) return;

      setLoading(true);
      setError(null);

      const userMsg = { role: "user", content: input };
      const chat = chats[activeChatId];

      // Optimistic UI – add the user message locally first
      const chatWithUser = {
        ...chat,
        messages: [...chat.messages, userMsg],
        meta: { ...chat.meta, updatedAt: Date.now() },
      };
      await persistChat(chatWithUser);

      // -----------------------------------------------------------------
      //  👉 NEW: call the LLM via the **service** (which uses apiClient)
      // -----------------------------------------------------------------
      try {
        const finalChat = await chatService.sendMessage({
          chatId: activeChatId,
          input,
          profile: {
            systemPrompt: "",          // expose later if you want a system prompt UI
            max_output_tokens: 0,
            temperature: 0,
          },
        });

        // Service returns the full updated chat (assistant reply already added)
        setChats((prev) => ({
          ...prev,
          [finalChat.meta.id]: finalChat,
        }));
      } catch (e) {
        // `chatService` propagates the unified error shape from apiClient
        setError(e.message ?? "Failed to send message");
      } finally {
        setLoading(false);
      }
    },
    [activeChatId, chats, persistChat, chatService]
  );

  const resetChat = useCallback(async () => {
    if (!activeChatId) return;
    const empty = {
      ...chats[activeChatId],
      messages: [],
      meta: { ...chats[activeChatId].meta, updatedAt: Date.now() },
    };
    await persistChat(empty);
  }, [activeChatId, chats, persistChat]);

  const createChat = useCallback(
    async (title = "New chat") => {
      const newChat = repository.createEmptyChat(title);
      await persistChat(newChat);
      setActiveChatId(newChat.meta.id);
    },
    [persistChat, repository]
  );

  const deleteChat = useCallback(
    async (chatId) => {
      try {
        await repository.deleteChat(chatId);
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
    [activeChatId, chats, repository]
  );

  /* ---------- 7️⃣ Context value – what UI consumes ---------- */
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