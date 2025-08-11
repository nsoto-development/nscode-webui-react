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
  $isParagraphNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
} from 'lexical';
import { CodeNode, $isCodeNode } from '@lexical/code';
import { ListItemNode, ListNode, $isListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS, $convertToMarkdownString } from '@lexical/markdown';
import * as LexicalHtml from '@lexical/html'; // Corrected: Using a namespace import
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
  ParagraphNode,
];

const EmptyStatePlugin = ({ onUpdateEmptyState }) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const content = root.getTextContent();
        const isEmpty = content.trim() === '';
        onUpdateEmptyState(isEmpty);
      });
    };
    const removeListener = editor.registerUpdateListener(update);
    update();
    return () => removeListener();
  }, [editor, onUpdateEmptyState]);
  return null;
};

const SubmitOnEnterPlugin = ({ onSubmit }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event.shiftKey) {
          return false;
        }
        event.preventDefault();
        event.stopPropagation();
        onSubmit(event);
        return true;
      },
      1
    );
  }, [editor, onSubmit]);
  return null;
};

// Plugin to handle pasting rich HTML content
const HtmlPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        const htmlData = clipboardData.getData('text/html');

        if (htmlData) {
          editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(htmlData, 'text/html');
            const nodes = LexicalHtml.$convertFromHTML(dom); // Corrected: Accessing function from namespace
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              $insertNodes(nodes);
            } else {
              const root = $getRoot();
              root.clear();
              root.append(...nodes);
            }
          });
          event.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
};

const MyLexicalEditor = forwardRef(({ onSubmit, onUpdateEmptyState }, ref) => {
  const [editor] = useLexicalComposerContext();

  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      let markdown = '';
      editor.getEditorState().read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      });
      return markdown;
    },
    clearEditor: () => {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
        root.getFirstChild().select();
      });
    },
  }));

  return (
    <>
      <RichTextPlugin
        contentEditable={
          <div className="editor-input-wrapper">
            <ContentEditable className="editor-input" spellCheck={true} autoFocus={true} />
          </div>
        }
        placeholder={<div className="editor-placeholder">Type your message...</div>}
      />
      <HistoryPlugin />
      <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      <ListPlugin />
      <LinkPlugin />
      <EmptyStatePlugin onUpdateEmptyState={onUpdateEmptyState} />
      <SubmitOnEnterPlugin onSubmit={onSubmit} />
      <HtmlPlugin />
    </>
  );
});

const MyLexicalEditorWithComposer = forwardRef(({ onSubmit, onUpdateEmptyState }, ref) => {
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
      <MyLexicalEditor
        ref={ref}
        onSubmit={onSubmit}
        onUpdateEmptyState={onUpdateEmptyState}
      />
    </LexicalComposer>
  );
});

export default function RichTextEditor() {
  const { isLoading, handleMessageSubmit } = useContext(ChatContext);
  const editorRef = useRef(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  const handleUpdateEmptyState = useCallback((isEmpty) => {
    setIsEditorEmpty(isEmpty);
  }, []);

  const handleSubmission = useCallback((e) => {
    e.preventDefault();

    if (!isEditorEmpty && editorRef.current) {
      const content = editorRef.current.getMarkdown();
      handleMessageSubmit(content);
      editorRef.current.clearEditor();
    }
  }, [isEditorEmpty, handleMessageSubmit]);

  return (
    <form className="input-form" onSubmit={handleSubmission}>
      <div className="input-container editor-wrapper">
        <MyLexicalEditorWithComposer
          ref={editorRef}
          onSubmit={handleSubmission}
          onUpdateEmptyState={handleUpdateEmptyState}
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