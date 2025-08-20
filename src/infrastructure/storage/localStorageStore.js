// src/infrastructure/storage/localStorageStore.js
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

  // ---- New helper: save a single message (used by the repository) ----
  async saveMessage(chatId, message) {
    const map = readAll();
    let chat = map[chatId];

    // ----- Defensive guard -------------------------------------------------
    // In normal operation the chat should already exist (we persist it on first
    // load). If it does not, we auto‑create a minimal placeholder so the app
    // does not crash and we get a helpful console warning.
    if (!chat) {
      console.warn(
        `[localStorageStore] Chat ${chatId} missing - auto-creating placeholder.`
      );
      const now = Date.now();
      chat = {
        meta: {
          id: chatId,
          title: "Recovered chat",
          createdAt: now,
          updatedAt: now,
        },
        messages: [],
      };
      map[chatId] = chat;
    }
    // ----------------------------------------------------------------------

    // Ensure the message has an id before pushing
    if (!message.id) {
      message.id = crypto.randomUUID ? crypto.randomUUID() : uuidv4();
    }

    chat.messages.push(message);
    writeAll(map);
    return chat;
  },
};
