// src/app/index.jsx
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Global CSS – you can keep it in src/styles/
import "../styles/index.css";

import ChatPage from "../pages/ChatPage.jsx";
import { ChatProvider } from "./providers/ChatProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChatProvider>
      <ChatPage />
    </ChatProvider>
  </StrictMode>
);