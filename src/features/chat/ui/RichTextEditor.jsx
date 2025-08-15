// src/components/RichTextEditor.jsx
import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  KEY_ENTER_COMMAND,
  $getRoot,
  $createParagraphNode,
  ParagraphNode,
} from "lexical";
import { CodeNode } from "@lexical/code";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import {
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import {
  TRANSFORMERS,
  $convertToMarkdownString,
} from "@lexical/markdown";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import HtmlPlugin from "./HtmlPlugin";
import "../../../styles/App.css";
import { useChat } from "../hooks/useChat";  

/* ---------- Theme & Nodes ---------- */
const theme = {
  code: "editor-code-block",
  paragraph: "editor-paragraph",
  placeholder: "editor-placeholder",
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

/* ---------- EmptyStatePlugin ---------- */
const EmptyStatePlugin = ({ onUpdateEmptyState }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const content = root.getTextContent();
        onUpdateEmptyState(content.trim() === "");
      });
    };
    const remove = editor.registerUpdateListener(update);
    update();
    return () => remove();
  }, [editor, onUpdateEmptyState]);

  return null;
};

/* ---------- SubmitOnEnterPlugin ---------- */
const SubmitOnEnterPlugin = ({ onSubmit }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event.shiftKey) return false;
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

/* ---------- Core editor component ---------- */
const MyLexicalEditor = forwardRef(({ onSubmit, onUpdateEmptyState }, ref) => {
  const [editor] = useLexicalComposerContext();

  // TRANSFORMERS already includes the multiline CODE transformer.
  const markdownTransformers = useMemo(() => [...TRANSFORMERS], []);

  // Expose imperative methods to the parent.
  useImperativeHandle(ref, () => ({
    /** Return markdown with a guaranteed language identifier */
    getMarkdown: () => {
      let markdown = "";
      editor.getEditorState().read(() => {
        // $convertToMarkdownString signature: (transformers?, rootNode?, preserveNewLines?)
        markdown = $convertToMarkdownString(markdownTransformers, $getRoot());
      });
      // ---- NEW: inject fallback language when missing ----
      // Replace a fence that is immediately followed by a newline (i.e. ```\n) with ```plaintext\n
      markdown = markdown.replace(
        // ^\s*   → start of line + any indentation
        // ```   → three back‑ticks
        // (?=\r?\n) → look‑ahead that the next characters are a newline (no language token)
        /^\s*```(?=\r?\n)/gm,
        (match) => `${match}plaintext`
      );
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
            <ContentEditable
              className="editor-input"
              spellCheck={true}
              autoFocus={true}
            />
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

/* ---------- Composer wrapper ---------- */
const MyLexicalEditorWithComposer = forwardRef(
  ({ onSubmit, onUpdateEmptyState }, ref) => {
    const initialConfig = {
      namespace: "my-chat-editor",
      theme,
      nodes: editorNodes,
      editorState: () => {
        const root = $getRoot();
        if (root.isEmpty()) {
          root.append($createParagraphNode());
        }
      },
      onError(error) {
        console.error("Lexical editor error:", error);
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
  }
);

/* ---------- Exported component ---------- */
export default function RichTextEditor() {
  const { isLoading, handleMessageSubmit } = useChat();
  const editorRef = useRef(null);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  const handleUpdateEmptyState = useCallback((isEmpty) => {
    setIsEditorEmpty(isEmpty);
  }, []);

  const handleSubmission = useCallback(
    (e) => {
      e.preventDefault();
      if (!isEditorEmpty && editorRef.current) {
        const content = editorRef.current.getMarkdown();
        console.log("📝 markdown payload →", content);
        handleMessageSubmit(content);
        editorRef.current.clearEditor();
      }
    },
    [isEditorEmpty, handleMessageSubmit]
  );

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
        {isLoading ? "Sending..." : "Send"}
      </button>
    </form>
  );
}
