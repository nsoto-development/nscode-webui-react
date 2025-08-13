// src/store/cosmosStore.js
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";

const endpoint = import.meta.env.VITE_COSMOS_ENDPOINT;
const key = import.meta.env.VITE_COSMOS_KEY;
const dbId = import.meta.env.VITE_COSMOS_DB;
const containerId = import.meta.env.VITE_COSMOS_CONTAINER;

const client = new CosmosClient({ endpoint, key });
const container = client.database(dbId).container(containerId);

export const cosmosStore = {
  async loadChats() {
    const { resources } = await container.items
      .query({ query: "SELECT * FROM c" })
      .fetchAll();
    const map = {};
    resources.forEach((c) => (map[c.meta.id] = c));
    return map;
  },

  async saveChat(chat) {
    await container.items.upsert(chat);
  },

  async deleteChat(chatId) {
    // partition key = /meta/id
    await container.item(chatId, chatId).delete();
  },

  createEmptyChat(title = "New chat") {
    const now = Date.now();
    return {
      meta: { id: uuidv4(), title, createdAt: now, updatedAt: now },
      messages: [],
    };
  },
};
