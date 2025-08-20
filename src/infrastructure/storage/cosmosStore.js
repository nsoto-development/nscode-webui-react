// src/infrastructure/storage/cosmosStore.js
import { apiClient } from "../api/apiClient";

export const cosmosStore = {
  // -------------------------------------------------
  // 1️⃣ Load every chat (returns a map: { id → { meta, messages } })
  // -------------------------------------------------
  async loadChats() {
    const { chats } = await apiClient.get("chats");
    const map = {};
    chats.forEach((c) => {
      // messages are stored separately, start empty here
      map[c.id] = { meta: c, messages: [] };
    });
    return map;
  },

  // -------------------------------------------------
  // 2️⃣ Save (create or update) a single chat meta document
  // -------------------------------------------------
  async saveChat(chat) {
    // -------------------------------------------------
    //   UNWRAP the UI’s nested shape before sending
    // -------------------------------------------------
    // `chat` coming from the UI looks like:
    //   { meta: { id, title, createdAt, updatedAt }, messages: [] }
    // The Azure Function expects the *flat* document:
    //   { id, title, createdAt, updatedAt, ownerId?, ttl? }
    const payload = {
      // copy everything from meta (id, title, timestamps, etc.)
      ...chat.meta,
      // optional fields you may want to keep – they are ignored if undefined
      ownerId: chat.meta.ownerId ?? null,
      ttl: chat.meta.ttl ?? 2592000,
    };

    // POST /api/v1/chats – raw chat document expected
    await apiClient.post("chats", payload);
  },

  // -------------------------------------------------
  // 3️⃣ Delete a chat (and its messages)
  // -------------------------------------------------
  async deleteChat(chatId) {
    await apiClient.delete(`chats/${chatId}`);
  },

  // -------------------------------------------------
  // 4️⃣ Get a single chat meta document
  // -------------------------------------------------
  async getChat(chatId) {
    const { chat } = await apiClient.get(`chats/${chatId}`);
    return chat; // raw chat document
  },

  // -------------------------------------------------
  // 5️⃣ Load messages for a specific chat
  // -------------------------------------------------
  async loadMessages(chatId) {
    const { messages } = await apiClient.get(`chats/${chatId}/messages`);
    return messages;
  },

  // -------------------------------------------------
  // 6️⃣ Persist a single message (assistant reply)
  // -------------------------------------------------
  async saveMessage(chatId, message) {
    await apiClient.post(`chats/${chatId}/messages`, message);
  },

  // -------------------------------------------------
  // 7️⃣ Helper – create a brand‑new empty chat (client‑side only)
  // -------------------------------------------------
  createEmptyChat(title = "New chat") {
    const now = Date.now();
    return {
      meta: {
        id: crypto.randomUUID(),
        title,
        createdAt: now,
        updatedAt: now,
      },
      messages: [],
    };
  },
};
