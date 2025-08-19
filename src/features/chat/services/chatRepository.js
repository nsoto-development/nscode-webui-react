// src/features/chat/services/chatRepository.js
/**
 * Thin wrapper around the low‑level store (localStorageStore or cosmosStore).
 * Adds a few helpers used by the service and the provider.
 */
export const chatRepositoryFactory = (store) => ({
  // ---- CRUD for chats -------------------------------------------------
  loadChats: () => store.loadChats(),
  saveChat: (chat) => store.saveChat(chat),
  deleteChat: (chatId) => store.deleteChat(chatId),
  createEmptyChat: (title) => store.createEmptyChat(title),

  // ---- Get a single chat (used by chatService.sendMessage) ------------
  async getChat(chatId) {
    // ---------- 1️⃣ Get the meta document ----------
    let meta;
    if (typeof store.getChat === "function") {
      meta = await store.getChat(chatId); // flat chat document
    } else {
      // Fallback – load all chats and pick the one we need (localStorage)
      const map = await store.loadChats();
      const chat = map[chatId];
      if (!chat) throw new Error(`Chat ${chatId} not found`);
      meta = chat.meta;
    }

    // ---------- 2️⃣ Load the messages for that chat ----------
    let messages = [];
    if (typeof store.loadMessages === "function") {
      messages = await store.loadMessages(chatId);
    } else {
      // localStorage already stores messages inside the chat object
      const map = await store.loadChats();
      const chat = map[chatId];
      if (chat && Array.isArray(chat.messages)) {
        messages = chat.messages;
      }
    }

    // ---------- 3️⃣ Return the shape the UI expects ----------
    return { meta, messages };
  },

  // ---- Load messages for a chat (used by ChatProvider) ---------------
  async loadMessages(chatId) {
    if (typeof store.loadMessages === "function") {
      const msgs = await store.loadMessages(chatId);
      // ---- Defensive deduplication by id ----
      const seen = new Set();
      return msgs.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    }
    // localStorage keeps messages inside the chat object, so just return []
    return [];
  },

  // ---- Persist a single message (used by chatService) ----------------
  async saveMessage(chatId, message) {
    if (typeof store.saveMessage === "function") {
      return store.saveMessage(chatId, message);
    }
    // Fallback for localStorage – push into the in‑memory map and save.
    const map = await store.loadChats();
    const chat = map[chatId];
    if (!chat) throw new Error(`Chat ${chatId} not found`);
    chat.messages.push(message);
    await store.saveChat(chat);
    return chat;
  },
});
