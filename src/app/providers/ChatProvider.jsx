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

export const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  /* ---------- 0️⃣ Choose storage (env flag) ---------- */
  const store =
    import.meta.env.VITE_USE_COSMOSDB === "true" && cosmosStore
      ? cosmosStore
      : localStorageStore;

  /* ---------- 1️⃣ Build repository + service (DI) ---------- */
  const repository = useMemo(() => chatRepositoryFactory(store), [store]);
  const chatService = useMemo(() => chatServiceFactory(repository), [repository]);

  /* ---------- 2️⃣ UI state ---------- */
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

  /* ---------- 4️⃣ Load chats on mount ---------- */
  useEffect(() => {
    (async () => {
      await migrateLegacyIfNeeded();
      setLoading(true);
      try {
        const map = await repository.loadChats(); // { id → { meta, messages } }
        setChats(map);

        const ids = Object.keys(map);
        if (ids.length) {
          const latest = ids.reduce((a, b) =>
            map[a].meta.updatedAt > map[b].meta.updatedAt ? a : b
          );
          setActiveChatId(latest);
        } else {
          // ---- NEW: create **and persist** the first chat ----
          const fresh = repository.createEmptyChat();

          // Persist the brand‑new chat so it exists in localStorage (or Cosmos)
          // Using the repository keeps the same optimistic‑UI flow you already have.
          await repository.saveChat(fresh);

          // Now the in‑memory state matches the persisted store.
          setChats({ [fresh.meta.id]: fresh });
          setActiveChatId(fresh.meta.id);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository]);

  /* ---------- 5️⃣ Load messages only when the active chat changes ---------- */
  useEffect(() => {
    if (!activeChatId) return;

    // Skip fetch if we already have messages (local‑storage case)
    if (chats[activeChatId]?.messages?.length) return;

    // Guard – not all stores implement loadMessages (localStorageStore doesn’t)
    if (typeof repository.loadMessages !== "function") return;

    // Ensure we fetch each chat only once per component lifetime
    const fetched = new Set(); // plain Set – no TypeScript generic syntax
    if (fetched.has(activeChatId)) return;
    fetched.add(activeChatId);

    (async () => {
      try {
        const msgs = await repository.loadMessages(activeChatId);
        setChats((prev) => ({
          ...prev,
          [activeChatId]: {
            ...prev[activeChatId],
            messages: msgs,
          },
        }));
      } catch (e) {
        console.warn("[ChatProvider] loadMessages failed:", e);
        setError(e.message ?? "Failed to load messages");
      }
    })();
    // Only re‑run when the active chat ID changes
  }, [activeChatId, repository]);

  /* ---------- 6️⃣ Persist a single chat (optimistic UI) ---------- */
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

  const handleMessageSubmit = useCallback(
    async (input) => {
      if (!input?.trim() || !activeChatId) return;

      setLoading(true);
      setError(null);

      // -------------------------------------------------
      // 1️⃣ Optimistic UI – add the user message locally
      // -------------------------------------------------
      const userMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: input,
      };
      const chat = chats[activeChatId];
      const chatWithUser = {
        ...chat,
        messages: [...chat.messages, userMsg],
        meta: { ...chat.meta, updatedAt: Date.now() },
      };

      // Update UI state immediately
      setChats((prev) => ({
        ...prev,
        [activeChatId]: chatWithUser,
      }));

      // Persist the new message **once** (localStorage or Cosmos)
      await repository.saveMessage(activeChatId, userMsg);

      // -------------------------------------------------
      // 2️⃣ Call the LLM via the service (assistant reply)
      // -------------------------------------------------
      try {
        const finalChat = await chatService.sendMessage({
          chatId: activeChatId,
          input,
          profile: {
            systemPrompt: "",
            max_output_tokens: 0,
            temperature: 0,
          },
        });

        // The service returns the full updated chat (user + assistant)
        setChats((prev) => ({
          ...prev,
          [finalChat.meta.id]: finalChat,
        }));
      } catch (e) {
        setError(e.message ?? "Failed to send message");
      } finally {
        setLoading(false);
      }
    },
    [activeChatId, chats, chatService, repository]
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

  // -----------------------------------------------------------------
  // 8️⃣ Create a new chat – **wait for the server before activating**
  // -----------------------------------------------------------------
  const createChat = useCallback(
    async (title = "New chat") => {
      // 1️⃣ Build a brand‑new empty chat locally
      const newChat = repository.createEmptyChat(title);

      // 2️⃣ Persist it on the back‑end (cosmosStore.saveChat will POST the raw chat)
      await persistChat(newChat);

      // 3️⃣ Now that the chat definitely exists on the server, make it active
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

  /* ---------- 9️⃣ Context value ---------- */
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
