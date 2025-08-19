// src/features/chat/services/chatService.js
import { apiClient } from "../../../infrastructure/api/apiClient";

export const chatServiceFactory = (repo) => ({
  // -----------------------------------------------------------------
  // 1️⃣ Load all chats (used on app start)
  // -----------------------------------------------------------------
  async loadChats() {
    return repo.loadChats();
  },

  // -----------------------------------------------------------------
  // 2️⃣ Persist a single chat (optimistic UI – called by the provider)
  // -----------------------------------------------------------------
  async saveChat(chat) {
    return repo.saveChat(chat);
  },

  // -----------------------------------------------------------------
  // 3️⃣ Delete a chat (called by the provider)
  // -----------------------------------------------------------------
  async deleteChat(chatId) {
    return repo.deleteChat(chatId);
  },

  // -----------------------------------------------------------------
  // 4️⃣ Send a user message to the LLM (OpenAI‑compatible endpoint)
  // -----------------------------------------------------------------
  /**
   * @param {Object} params
   *   - chatId: string
   *   - input: string (markdown from the editor)
   *   - profile: { systemPrompt, max_output_tokens, temperature }
   */
  async sendMessage({ chatId, input, profile }) {
    // 1️⃣ Get the current chat (including its existing messages)
    const chat = await repo.getChat(chatId);

    // 2️⃣ Build the OpenAI‑compatible payload
    const payload = [
      { role: "system", content: profile.systemPrompt },
      ...chat.messages,
      { role: "user", content: input },
    ];

    // 3️⃣ Call the Azure Function – **no extra version segment**
    const resp = await apiClient.post(
      "chat/completions", // <-- correct path (env already contains /v1)
      {
        model: "test-model",
        messages: payload,
        max_tokens: profile.max_output_tokens,
        temperature: profile.temperature,
      }
    );

    // 4️⃣ Normalise the assistant reply (covers a few shapes)
    let assistantMsg = null;

    // OpenAI‑compatible shape
    if (resp?.choices?.[0]?.message) {
      assistantMsg = resp.choices[0].message;
    }

    // Some wrappers return the message directly under choices[0]
    if (!assistantMsg && resp?.choices?.[0]) {
      const maybe = resp.choices[0];
      if (maybe.role && maybe.content) {
        assistantMsg = maybe;
      }
    }

    // Fallback placeholder – guarantees UI never crashes
    assistantMsg = assistantMsg ?? {
      role: "assistant",
      content: "[No response]",
    };

    // ---- Ensure a unique id for the assistant message ----
    if (!assistantMsg.id) {
      assistantMsg.id = crypto.randomUUID();
    }

    // 5️⃣ Persist the assistant message in the *messages* container
    await repo.saveMessage(chatId, assistantMsg);

    // 6️⃣ Build the updated chat (includes the new message)
    const updatedChat = {
      ...chat,
      messages: [...chat.messages, assistantMsg],
      meta: { ...chat.meta, updatedAt: Date.now() },
    };

    // 7️⃣ Persist the chat meta (updatedAt) – optional but keeps timestamps in sync
    await repo.saveChat(updatedChat);

    // 8️⃣ Return the updated chat so the provider can update UI instantly
    return updatedChat;
  },

  // -----------------------------------------------------------------
  // 5️⃣ Helper to create a brand‑new chat (used by provider)
  // -----------------------------------------------------------------
  async createChat(title = "New chat") {
    const newChat = repo.createEmptyChat(title);
    await repo.saveChat(newChat);
    return newChat;
  },
});
