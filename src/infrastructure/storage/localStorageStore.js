// src/store/localStorageStore.js
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "nscode-multi-chats";

/* ---------- Helper to read/write the whole map ---------- */
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/* ---------- Public API ---------- */
export const localStorageStore = {
  // Load every chat (returns { chatId: chatObject, … })
  async loadChats() {
    return readAll();
  },

  // Save (create or update) a single chat
  async saveChat(chat) {
    const map = readAll();
    map[chat.meta.id] = chat;
    writeAll(map);
  },

  // Delete a chat by its id
  async deleteChat(chatId) {
    const map = readAll();
    delete map[chatId];
    writeAll(map);
  },

  // Helper to create a brand‑new empty chat
  createEmptyChat(title = "New chat") {
    const now = Date.now();
    return {
      meta: {
        id: uuidv4(),
        title,
        createdAt: now,
        updatedAt: now,
      },
      messages: [],
    };
  },
};
