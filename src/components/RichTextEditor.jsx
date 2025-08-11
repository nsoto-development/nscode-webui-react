import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useContext, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  KEY_ENTER_COMMAND,
  $getRoot,
  $createParagraphNode,
  ParagraphNode,
  LineBreakNode
} from 'lexical';
import { CodeNode } from '@lexical/code';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';

import '../App.css';
import { ChatContext } from '../context/ChatContext';

const theme = {
  code: 'editor-code-block',
  paragraph: 'editor-paragraph',
  placeholder: 'editor-placeholder',
};

const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  LinkNode,
  LineBreakNode,
  ParagraphNode,
];

function ToolbarPlugin({ onUpdateEmptyState }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const checkEmptyState = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const content = root.getTextContent();
        const isEditorContentEmpty = content.trim() === '';
        const isEmptyParagraphOnly = root.getChildrenSize() === 1 && root.getFirstChild()?.getTextContent() === '';
        const isEmpty = isEditorContentEmpty && isEmptyParagraphOnly;
        onUpdateEmptyState(isEmpty);
      });
    };
    
    const removeListener = editor.registerUpdateListener(checkEmptyState);
    checkEmptyState();

    return () => removeListener();
  }, [editor, onUpdateEmptyState]);

  return null;
}

function KeyBindingsPlugin({ onSubmit, isEditorEmpty }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event.shiftKey) {
          return false;
        }

        if (!isEditorEmpty) {
          editor.update(() => {
            const root = $getRoot();
            const content = root.getTextContent();
            onSubmit(content);
            root.clear();
            root.append($createParagraphNode());
          });
        }
        
        return true;
      },
      1
    );
  }, [editor, onSubmit, isEditorEmpty]);

  return null;
}

// NEW: This component wraps the imperative logic
function LexicalController({ onSubmit, isEditorEmpty, submitRef }) {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(submitRef, () => ({
    submit: () => {
      if (!isEditorEmpty) {
        editor.update(() => {
          const root = $getRoot();
          const content = root.getTextContent();
          onSubmit(content);
          root.clear();
          root.append($createParagraphNode());
        });
      }
    },
  }));

  return null;
}

const MyLexicalEditor = forwardRef(({ onSubmit, onUpdateEmptyState, isEditorEmpty }, ref) => {
    const initialConfig = {
      namespace: 'my-chat-editor',
      theme,
      nodes: editorNodes,
      editorState: () => {
        const root = $getRoot();
        if (root.isEmpty()) {
          root.append($createParagraphNode());
        }
      },
      onError(error) {
        console.error('Lexical editor error:', error);
      },
    };

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={
            <div className="editor-input-wrapper">
              <ContentEditable
                className="editor-input"
                spellCheck={true}
                autoFocus={false}
              />
            </div>
          }
          placeholder={<div className="editor-placeholder">Type your message...</div>}
        />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <ListPlugin />
        <LinkPlugin />
        
        <ToolbarPlugin onUpdateEmptyState={onUpdateEmptyState} />
        <KeyBindingsPlugin onSubmit={onSubmit} isEditorEmpty={isEditorEmpty} />
        <LexicalController onSubmit={onSubmit} isEditorEmpty={isEditorEmpty} submitRef={ref} /> {/* NEW COMPONENT */}
      </LexicalComposer>
    );
});

export default function RichTextEditor() {
  const { isLoading, handleMessageSubmit } = useContext(ChatContext);
  const submitRef = useRef(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  const handleUpdateEmptyState = useCallback((isEmpty) => {
    setIsEditorEmpty(isEmpty);
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (submitRef.current) {
      submitRef.current.submit();
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="input-form">
      <div className="input-container editor-wrapper">
        <MyLexicalEditor 
          ref={submitRef} 
          onSubmit={handleMessageSubmit}
          onUpdateEmptyState={handleUpdateEmptyState}
          isEditorEmpty={isEditorEmpty}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || isEditorEmpty}
        className="send-button"
      >
        {isLoading ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}