import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "../../../styles/App.css";
import { useChat } from "../hooks/useChat";

/* -----------------------------------------------------------------
   Helper function to copy text to the clipboard
   ----------------------------------------------------------------- */
const copyToClipboard = async (text) => {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall‑through to legacy method
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const successful = document.execCommand("copy");
    return successful;
  } finally {
    document.body.removeChild(textarea);
  }
};

/* -----------------------------------------------------------------
   SVG for the copy icon
   ----------------------------------------------------------------- */
const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    fill="currentColor"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d="M10 1.5a.5.5 0 0 1 .5.5v1h1A1.5 1.5 0 0 1 13 4.5v8A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-8A1.5 1.5 0 0 1 4.5 3h1V2a.5.5 0 0 1 .5-.5h4zM9 2H7v1h2V2zM4.5 4a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-7z" />
  </svg>
);

/* -----------------------------------------------------------------
   Memoized UI for fenced code blocks
   ----------------------------------------------------------------- */
const CodeBlock = memo(({ className, children, copyHandler, id, copiedId }) => {
  const language = className?.replace("language-", "") || "text";
  const isCopied = copiedId === id;

  const handleCopy = useCallback(() => {
    const codeContent = Array.isArray(children)
      ? children.map((child) => (typeof child === "string" ? child : child.props.children)).join("")
      : children.toString();
    copyHandler(codeContent, id);
  }, [children, copyHandler, id]);

  return (
    <div className="code-block-container">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <div className="copy-container">
          <button className="copy-button" onClick={handleCopy} aria-label="Copy code">
            <CopyIcon />
            <span className="visually-hidden">Copy</span>
          </button>
          {isCopied && <span className="copied-message visible">Copied!</span>}
        </div>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
});

/* -----------------------------------------------------------------
   The main component that renders the chat
   ----------------------------------------------------------------- */
const MemoizedMessageList = memo(() => {
  // <-- use the hook instead of useContext(ChatContext)
  const { messages, isLoading } = useChat();

  const messagesEndRef = useRef(null);
  const prevLength = useRef(messages.length);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages]);

  const handleCopy = useCallback(async (text, id) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      alert("Copy failed - please try again.");
    }
  }, []);

  const remarkPlugins = useMemo(() => [remarkGfm], []);

  const rehypePlugins = useMemo(
    () => [
      [
        rehypeSanitize,
        {
          ...defaultSchema,
          tagNames: [...defaultSchema.tagNames, "input"],
          attributes: {
            ...defaultSchema.attributes,
            input: ["type", "checked", "disabled"],
            code: ["className"],
          },
        },
      ],
    ],
    []
  );

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <p className="placeholder-text">Start the conversation…</p>
      ) : (
        messages.map((msg, idx) => {
          const messageId = `msg-${msg.id ?? idx}`;
          const content = msg.content || "⚠️ Message content not available.";
          const isMessageCopied = copiedId === messageId;

          return (
            <div key={messageId} className={`message-bubble ${msg.role}`}>
              <div className="message-content">
                <ReactMarkdown
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={rehypePlugins}
                  components={{
                    code({ className, children }) {
                      if (!className) {
                        return <code className="inline-code">{children}</code>;
                      }
                      const codeBlockId = `code-${messageId}-${className}`;
                      return (
                        <CodeBlock
                          className={className}
                          copyHandler={handleCopy}
                          id={codeBlockId}
                          copiedId={copiedId}
                        >
                          {children}
                        </CodeBlock>
                      );
                    },
                    table: ({ children }) => (
                      <table className="markdown-table">{children}</table>
                    ),
                    th: ({ children }) => (
                      <th className="markdown-th">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="markdown-td">{children}</td>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              <div className="copy-container">
                <button
                  className="copy-button"
                  onClick={() => handleCopy(content, messageId)}
                  aria-label="Copy message"
                >
                  <CopyIcon />
                  <span className="visually-hidden">Copy</span>
                </button>
                {isMessageCopied && (
                  <span className="copied-message visible">Copied!</span>
                )}
              </div>
            </div>
          );
        })
      )}

      {isLoading && (
        <div className="message-bubble assistant">
          <div className="dot-flashing"></div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});

export default MemoizedMessageList;
