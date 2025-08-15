// src/features/chat/services/chatService.js
import { apiClient } from "../../../infrastructure/api/apiClient";

/**
 * Factory – receives a repository (the object created by chatRepositoryFactory)
 * and returns an object exposing the business operations the UI needs.
 */
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
  // 4️⃣ Send a user message to the LLM
  // -----------------------------------------------------------------
  /**
   * @param {Object} params
   *   - chatId: string
   *   - input: string (markdown from the editor)
   *   - profile: { systemPrompt, max_output_tokens, temperature }
   */
  async sendMessage({ chatId, input, profile }) {
    // 1️⃣ Get the current chat (repository helper)
    const chat = await repo.getChat(chatId);

    // 2️⃣ Build the payload for the LLM
    const payload = [
      { role: "system", content: profile.systemPrompt },
      ...chat.messages,
      { role: "user", content: input },
    ];

    // 3️⃣ Call the Azure Function via the central client
    const resp = await apiClient.post(
      "/prompt",
      {
        model: "test-model",
        messages: payload,
        max_tokens: profile.max_output_tokens,
        temperature: profile.temperature,
      },
      {
        tokenBudget: { maxInputTokens: 1500, maxOutputTokens: 800 },
      }
    );

    const assistantMsg =
      resp.choices?.[0]?.message ?? {
        role: "assistant",
        content: "[No response]",
      };

    // 4️⃣ Return the updated chat (provider will persist it)
    const updatedChat = {
      ...chat,
      messages: [...chat.messages, assistantMsg],
      meta: { ...chat.meta, updatedAt: Date.now() },
    };
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