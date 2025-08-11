import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../App.css';

function ChatInput({ onSubmit, isLoading }) {
  const [input, setInput] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [isCodeBlock, setIsCodeBlock] = useState(false);
  const textareaRef = useRef(null);

  // Auto-focus the textarea when entering code block mode
  useEffect(() => {
    if (isCodeBlock && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isCodeBlock]);

  const handleKeyDown = (e) => {
    // Check for the '```' trigger at the very start of the input
    if (!isCodeBlock && input === '``' && e.key === '`') {
      e.preventDefault(); // Prevent the third backtick from being typed
      setIsCodeBlock(true); // Switch to code block mode
      setInput(''); // Clear the main input
      return;
    }

    // If Enter is pressed without Shift, send the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    if (isCodeBlock) {
      setCodeContent(e.target.value);
    } else {
      setInput(e.target.value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let messageToSend = '';

    if (isCodeBlock) {
      messageToSend = `\`\`\`\n${codeContent}\n\`\`\``;
    } else {
      messageToSend = input;
    }

    if (messageToSend.trim() !== '') {
      onSubmit(messageToSend);
      setInput('');
      setCodeContent('');
      setIsCodeBlock(false); // Reset to normal mode after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="input-form">
      <textarea
        ref={textareaRef}
        value={isCodeBlock ? codeContent : input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={isCodeBlock ? "Enter code here..." : "Type your message..."}
        rows={isCodeBlock ? 6 : 1}
        disabled={isLoading}
        className={`input-textarea ${isCodeBlock ? 'code-block-active' : ''}`}
      />
      <button
        type="submit"
        disabled={isLoading || (isCodeBlock ? !codeContent.trim() : !input.trim())}
        className="send-button"
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}

export default ChatInput;