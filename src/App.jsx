import { useState, useEffect } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FaCopy } from 'react-icons/fa';
import { useCopyToClipboard } from './hooks/useCopyToClipboard';


function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Use the custom hook to manage copy state and functionality
  const [isCopied, copy] = useCopyToClipboard();

  // You would replace this with your actual Azure Function URL
  const azureFunctionUrl = "http://localhost:7071/CodeAgentFunction/v1/chat/completions";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError(null);

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const res = await fetch(azureFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "test-model",
          messages: newMessages
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      const assistantMessage = data.choices[0].message;
      setMessages([...newMessages, assistantMessage]);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="app-container">
      <div className="chat-window">
        <h1 className="chat-header">LLM Test Interface</h1>
        <div className="message-list">
          {messages.length === 0 && (
            <p className="placeholder-text">Start the conversation...</p>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.role}`}>
              <div className="message-content">
                <strong>{msg.role}:</strong>
                <ReactMarkdown
                  children={msg.content}
                  components={{
                    // This is the custom component for a code block
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      return !inline && match ? (
                        <div className="code-block-container">
                          <div className="code-header">
                            <span className="code-language">{match[1]}</span>
                            <div className="copy-container">
                              {/* The copy button and copied message */}
                              <button className="copy-button" onClick={() => copy(codeContent)}>
                                <FaCopy />
                              </button>
                              {/* Display "Copied!" message for 2 seconds */}
                              {isCopied && <span className="copied-message">Copied!</span>}
                            </div>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {codeContent}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                />
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-bubble assistant">
              <div className="dot-flashing"></div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="input-form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} 
            placeholder="Type your message here..."
            rows="3"
            disabled={loading}
            className="input-textarea"
          />
          <button type="submit" disabled={loading} className="send-button">
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
      {error && <p className="error-message">Error: {error}</p>}
    </div>
  );
}

export default App;