// src/infrastructure/storage/cosmosApi.js
import { apiClient } from "../api/apiClient";

/**
 * Thin wrapper that forwards repository calls to the Azure Function.
 * It deliberately mirrors the method names of the original cosmosStore
 * so the rest of the React code does not need to change.
 */
export const cosmosStore = {
  async loadChats() {
    // GET /api/chats
    return apiClient.get("/chats");
  },

  async saveChat(chat) {
    // POST /api/chats  (payload { chat })
    return apiClient.post("/chats", { chat });
  },

  async deleteChat(chatId) {
    // DELETE /api/chats/{chatId}
    return apiClient.delete(`/chats/${chatId}`);
  },

  async getChat(chatId) {
    // GET /api/chats/{chatId}
    return apiClient.get(`/chats/${chatId}`);
  },

  // createEmptyChat does not need the server – we can keep the same logic client‑side
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
