# nscode‑webui‑react — Test Harness for **nscode‑agent‑func** (Azure Functions v2)

A tiny React UI that lets you experiment with `nscode-chat-api` which exposes an endpoint path 
`api/v1/chat/completions`.  
It sends OpenAI‑compatible chat requests, receives the response, and displays the conversation.

---  

## Table of Contents
1. [Features](#features)  
2. [Prerequisites](#prerequisites)  
3. [Installation & Build](#installation--build)  
4. [Configuration](#configuration)  
5. [Running the UI](#running-the-ui)  
6. [Project Layout](#project‑layout)  
7. [Available Scripts](#available-scripts)  
8. [Testing](#testing)  
9. [Contributing](#contributing)  
10. [License](#license)  

---  

## Features
| ✅ | Description |
|---|-------------|
| **OpenAI‑compatible** | Sends the exact JSON payload the Azure Function expects (`model`, `messages`). |
| **Rich‑text editor** | Lexical‑based editor with markdown, code‑block support and **Enter‑to‑send**. |
| **Copy‑to‑clipboard** | One‑click copy of assistant replies. |
| **Prompt‑profile handling** | Mirrors the intent‑profile logic used in the Azure Function (brief, standard, deep, design, review, default). |
| **Error display** | Shows OpenAI‑style error objects returned by the function. |
| **Zero‑config dev server** | Vite dev server with hot‑reload. |
| **Clean‑architecture layout** | UI → feature‑scoped hooks → service → repository → infrastructure. |
| **Local‑storage persistence only** | The client stores chats in either `localStorage` or `cosmosStore` with specified Cosmos DB config. |
| **Token‑budget removed (for now)** | The token‑budget guard has been stripped out to simplify the flow; it can be re‑added later if needed. |

---  

## Prerequisites
| Tool | Minimum version |
|------|-----------------|
| **Node.js** | 18.x |
| **npm** (or **yarn**) | 9.x |
| **Git** | any |

---  

## Installation & Build
```bash
# 1️⃣ Clone the private repo (access required)
git clone https://github.com/your-org/nscode-webui-react.git
cd nscode-webui-react

# 2️⃣ Install dependencies
npm ci          # or: yarn install --frozen-lockfile

# 3️⃣ Build for production (optional)
npm run build   # outputs to ./dist
```

---  

## Configuration
The UI reads the Azure Function endpoint from an environment variable at **build time**.

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_NSCODE_AGENT_ENDPOINT` | ✅ | `http://localhost:7071/api/v1/` |

Create a `.env` file in the project root (Vite automatically prefixes variables with `VITE_`):

```dotenv
VITE_NSCODE_AGENT_ENDPOINT=http://localhost:7071/CodeAgentFunction/
```

> **Note** – The endpoint should point **only to the function root**.  
> The OpenAI‑compatible path (`/chat/completions`) is supplied by the client when it calls the API.

---  

## Running the UI
```bash
npm run dev
```

Open <http://localhost:5173> (or the URL shown in the console).

* Type a message → **Enter** (or click **Send**).  
* Use triple back‑ticks (```` ``` ````) to start a code‑block.  
* Assistant replies flow below your message intuitively; click the clipboard icon to copy.

---  

## Project Layout
```
public/
src/
├─ app/
│   ├─ index.jsx                     # Vite entry point (bootstrap)
│   └─ providers/
│       └─ ChatProvider.jsx          # DI container + UI state, uses only localStorageStore
│
├─ assets/                           # static assets (icons, images, etc.)
│
├─ features/
│   └─ chat/
│       ├─ hooks/
│       │   ├─ useChat.js
│       │   └─ useCopyToClipboard.js
│       ├─ models/                  # (optional) type definitions or schemas
│       ├─ services/
│       │   ├─ chatRepository.js    # thin wrapper around the chosen store
│       │   └─ chatService.js       # business use‑cases (sendMessage, createChat, …)
│       └─ ui/
│           ├─ ChatSelector.jsx
│           ├─ HtmlPlugin.jsx
│           ├─ MemoizedMessageList.jsx
│           └─ RichTextEditor.jsx
│
├─ infrastructure/
│   ├─ api/
│   │   └─ apiClient.js              # central fetch wrapper (retries, unified errors)
│   ├─ storage/
│   │   ├─ cosmosStore.js            # persistence in CosmosDB (VITE_USE_COSMOSDB=true)
│   │   └─ localStorageStore.js      # persistence in browser localStorage (VITE_USE_COSMOSDB=false)
│   └─ utils/                        # misc utilities (e.g., ErrorBoundary)
│
├─ pages/
│   └─ ChatPage.jsx                 # page component that composes the UI
│
├─ styles/
│   ├─ App.css
│   └─ index.css
│
├─ index.html
├─ vite.config.js
├─ eslint.config.js
├─ package.json
└─ README.md
```

### What changed from the original scaffold
* **`cosmosStore.js` remains in the repository** (it is currently unused by the front‑end).  
* **`ChatProvider.jsx` lives under `src/app/providers/`** and is the only place that wires the store, repository, and service together.  
* **`useChat` is now feature‑scoped** (`src/features/chat/hooks/useChat.js`) and reads from the `ChatContext` exported by `ChatProvider`.  
* **`apiClient.post` no longer receives a token‑budget object**; callers simply pass the path (`"v1/chat/completions"`) and the payload.  
* **The UI now follows a clean‑architecture folder layout** (presentation → feature → services → infrastructure).  

---  

## Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Starts Vite dev server with hot‑reload. |
| `npm run build` | Produces a production bundle in `dist/`. |
| `npm run lint` | Runs ESLint (React + JSX). |
| `npm run preview` | Serves the production build locally. |

---  

## Testing
```bash
# Install dev dependencies (if not already)
npm i -D @testing-library/react @testing-library/jest-dom jest

# Run tests
npm test
```

*Mock the `fetch` call to `VITE_NSCODE_AGENT_ENDPOINT` to avoid hitting the real Azure Function.*

---  

## Contributing
1. Fork the repository.  
2. Create a feature branch (`git checkout -b feat/your‑feature`).  
3. Keep commits atomic and run `npm run lint` before pushing.  
4. Open a PR against `main`.  

All code follows the existing ESLint + Prettier configuration.

---  

## License
This project is **private/internal** to the organization. Redistribution or public release requires explicit permission from the repository owners.  