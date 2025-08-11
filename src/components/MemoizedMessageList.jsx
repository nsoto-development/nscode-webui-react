import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  useContext, // FIX: Import useContext
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "../App.css";
import { ChatContext } from "../context/ChatContext"; // FIX: Import ChatContext

/* --------------------------------------------------------------
   Helper – copy text to clipboard (async API + legacy fallback)
   -------------------------------------------------------------- */
const copyToClipboard = async (text) => {
  // Preferred modern API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall-through to legacy method
    }
  }

  // Legacy fallback – hidden textarea + execCommand
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed"; // avoid scrolling
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

/* --------------------------------------------------------------
   CodeBlock – memoised UI for fenced code blocks
   -------------------------------------------------------------- */
const CodeBlock = memo(({ className, children, copyHandler, id, copiedId }) => {
  const language = className?.replace("language-", "") || "text";
  const isCopied = copiedId === id;

  const handleCopy = useCallback(() => {
    copyHandler(children, id);
  }, [children, copyHandler, id]);

  return (
    <div className="code-block-container">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <div className="copy-container">
          <button className="copy-button" onClick={handleCopy} aria-label="Copy code">
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

/* --------------------------------------------------------------
   MemoizedMessageList – the main component that renders the chat
   -------------------------------------------------------------- */
const MemoizedMessageList = memo(() => { // FIX: No more props
    // FIX: Get values from context
    const { messages, isLoading, isCopied, copy } = useContext(ChatContext);
    
    const messagesEndRef = useRef(null);
    const prevLength = useRef(messages.length);
    const [copiedId, setCopiedId] = useState(null);

    /* ---------- Auto-scroll when a new message arrives ---------- */
    useEffect(() => {
      if (messages.length > prevLength.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      prevLength.current = messages.length;
    }, [messages]);

    /* ---------- Central copy-handler (used by code blocks & whole messages) ---------- */
    const handleCopy = useCallback(async (text, id) => {
      const success = await copyToClipboard(text);
      if (success) {
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId(null);
        }, 2000); // Reset copied state after 2 seconds
      } else {
        alert("Copy failed - please try again.");
      }
    }, []);

    /* ---------- Markdown plugins (memoised for stability) ---------- */
    const remarkPlugins = useMemo(() => [remarkGfm], []);
    
    const rehypePlugins = useMemo(
      () => [[rehypeSanitize, { ...defaultSchema }]],
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
                      code({ node, inline, className, children, ...props }) {
                        if (inline) {
                          return <code className="inline-code">{children}</code>;
                        }

                        const codeText = Array.isArray(children) ? children.join("") : children;
                        
                        const codeBlockId = `code-${messageId}-${node.position.start.line}-${node.position.start.column}`;

                        return (
                          <CodeBlock
                            className={className}
                            copyHandler={handleCopy}
                            id={codeBlockId}
                            copiedId={copiedId}
                          >
                            {codeText}
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
  },
  () => true // FIX: Now we can use this custom function or omit it for default behavior
);

export default MemoizedMessageList;