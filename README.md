# nscode‑webui‑react — Test Harness for **nscode‑agent‑func** (Azure Functions v2)

A tiny React UI that lets you experiment with the private Azure Function wrapper (`CodeAgentFunction/v1/chat/completions`).  
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
| **OpenAI‑compatible** | Sends the same JSON payload the Azure Function expects (`model`, `messages`, `max_tokens`, …). |
| **Rich‑text editor** | Lexical‑based editor with markdown, code‑block support and *Enter*‑to‑send. |
| **Copy‑to‑clipboard** | One‑click copy of assistant replies. |
| **Prompt‑profile handling** | Mirrors the intent‑profile logic used in the Azure Function (brief, standard, deep, design, review, default). |
| **Error display** | Shows OpenAI‑style error objects returned by the function. |
| **Zero‑config dev server** | Vite dev server with hot‑reload. |

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
The UI reads the Azure Function endpoint from an environment variable at build time.

| Variable | Required | Example |
|----------|----------|---------|
| `VITE_NSCODE_AGENT_ENDPOINT` | ✅ | `https://my-func-app.azurewebsites.net/api/CodeAgentFunction/v1/chat/completions` |

Create a `.env` file in the project root (Vite automatically prefixes with `VITE_`):

```dotenv
VITE_NSCODE_AGENT_ENDPOINT=https://my-func-app.azurewebsites.net/api/CodeAgentFunction/v1/chat/completions
```

> **Note** – The Azure Function itself handles intent detection, per‑intent parameters, and OpenAI‑compatible responses. The UI only forwards the request.

---  

## Running the UI
```bash
npm run dev
```

Open <http://localhost:5173> (or the URL shown in the console).  

* Type a message → **Enter** (or click **Send**).  
* Use triple back‑ticks (```` ``` ````) to start a code‑block mode.  
* Assistant replies appear below; click the clipboard icon to copy.

---  

## Project Layout
```
src/
├─ components/
│   ├─ MemoizedMessageList.jsx   # renders chat history
│   ├─ RichTextEditor.jsx        # Lexical editor + plugins
│   └─ ChatInput.jsx             # fallback textarea input
├─ context/
│   └─ ChatContext.jsx           # global state (messages, loading, errors)
├─ hooks/
│   └─ useCopyToClipboard.jsx    # clipboard helper
├─ App.jsx                       # core logic – builds OpenAI request, calls endpoint
├─ main.jsx                      # Vite entry point
└─ index.css / App.css           # minimal styling
```

---  

## Available Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Starts Vite dev server (hot‑reload). |
| `npm run build` | Produces a production bundle in `dist/`. |
| `npm run preview` | Serves the production build locally. |
| `npm run lint` | Runs ESLint (React + JSX). |
| `npm test` | Placeholder – add Jest / React Testing Library tests. |

---  

## Testing
```bash
# Install dev deps (if not already)
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