// src/features/chat/services/chatRepository.js
/**
 * Thin wrapper around the low‑level store (localStorageStore or cosmosStore).
 * Adds a `getChat` helper used by the service.
 */
export const chatRepositoryFactory = (store) => ({
  // Existing API (kept for backward compatibility)
  loadChats: () => store.loadChats(),
  saveChat: (chat) => store.saveChat(chat),
  deleteChat: (chatId) => store.deleteChat(chatId),
  createEmptyChat: (title) => store.createEmptyChat(title),

  // New helper used by chatService.sendMessage
  async getChat(chatId) {
    const map = await store.loadChats(); // map = { id → chat }
    const chat = map[chatId];
    if (!chat) throw new Error(`Chat ${chatId} not found`);
    return chat;
  },
});