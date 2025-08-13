// src/store/cosmosStore.js
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from "uuid";

/* -------------------------------------------------
   Environment variables – Vite injects only variables
   that start with VITE_ (make sure they exist in .env)
   ------------------------------------------------- */
const endpoint   = import.meta.env.VITE_COSMOSDB_ENDPOINT;   // e.g. https://localhost:8081
const key        = import.meta.env.VITE_COSMOSDB_KEY;       // emulator master key
const dbId       = import.meta.env.VITE_COSMOSDB_DB;        // e.g. nscode-db
const containerId= import.meta.env.VITE_COSMOSDB_CONTAINER; // e.g. chats

/* -------------------------------------------------
   Initialise the client – the SDK will use the OS‑trusted
   certificate (the emulator cert you imported). No extra
   TLS options are required for the browser.
   ------------------------------------------------- */
const client = new CosmosClient({ endpoint, key });

/* -------------------------------------------------
   Helper – ensure the database and container exist.
   This runs lazily the first time any store method is
   called, so you never have to run a separate script.
   ------------------------------------------------- */
let _containerPromise = null;
async function getContainer() {
  if (_containerPromise) return _containerPromise;

  _containerPromise = (async () => {
    // 1️⃣ Create / get the database
    const { database } = await client.databases.createIfNotExists({
      id: dbId,
    });

    // 2️⃣ Create / get the container (partition key = /meta/id)
    const { container } = await database.containers.createIfNotExists({
      id: containerId,
      partitionKey: { paths: ["/meta/id"], version: 1 },
    });

    return container;
  })();

  return _containerPromise;
}

/* -------------------------------------------------
   Public API – matches the shape expected by ChatContext
   ------------------------------------------------- */
export const cosmosStore = {
  /** Load **all** chats for the current user. */
  async loadChats() {
    try {
      const container = await getContainer();

      // readAll() automatically does a cross‑partition query
      const { resources } = await container.items.readAll().fetchAll();

      // Convert the flat array into the map { chatId → chatObject }
      const map = {};
      resources.forEach((chat) => {
        if (chat?.meta?.id) {
          map[chat.meta.id] = chat;
        }
      });
      return map;
    } catch (err) {
      console.error("[cosmosStore] loadChats error:", err);
      // Propagate the error – ChatContext will surface it in UI
      throw err;
    }
  },

  /** Upsert a single chat (create or update). */
  async saveChat(chat) {
    try {
      const container = await getContainer();
      await container.items.upsert(chat);
    } catch (err) {
      console.error("[cosmosStore] saveChat error:", err);
      throw err;
    }
  },

  /** Delete a chat by its id (partition key = /meta/id). */
  async deleteChat(chatId) {
    try {
      const container = await getContainer();
      // The SDK requires both id and partition key – they are the same here
      await container.item(chatId, chatId).delete();
    } catch (err) {
      console.error("[cosmosStore] deleteChat error:", err);
      throw err;
    }
  },

  /** Helper used by the UI when a brand‑new chat is needed. */
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
