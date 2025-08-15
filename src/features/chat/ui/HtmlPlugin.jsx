// src/components/HtmlPlugin.jsx
import React, { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  PASTE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $getRoot,
} from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';
import { $createCodeNode } from '@lexical/code';
import { $createTextNode } from 'lexical'; // needed for plain‑text inside a CodeNode

/**
 * HtmlPlugin – handles paste events.
 *
 *  • If the pasted HTML contains one or more <pre> elements we create a
 *    CodeNode for each, set its language (if we can detect one) and insert the
 *    raw text as a TextNode.
 *  • Otherwise we fall back to Lexical’s default HTML‑to‑Lexical conversion.
 *
 *  The language detection looks for:
 *    • <code class="language‑xxx"> … </code>
 *    • <pre class="language‑xxx"> … </pre>
 *  If nothing matches we use the literal string "plaintext".  This ensures the
 *  CODE_BLOCK_TRANSFORMER later emits a fenced block (```plaintext) instead of an
 *  empty language identifier.
 */
const HtmlPlugin = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const htmlData = event.clipboardData?.getData('text/html');
        if (!htmlData) return false;

        editor.update(() => {
          const dom = new DOMParser().parseFromString(htmlData, 'text/html');
          const preElements = dom.querySelectorAll('pre');

          // ---------- Handle <pre> (code block) ----------
          if (preElements.length > 0) {
            preElements.forEach((pre) => {
              const codeText = pre.textContent ?? '';

              // Detect language – fallback to "plaintext"
              const detectedLang =
                pre.querySelector('code')?.className?.match(/language-(\w+)/)?.[1] ||
                pre.className?.match(/language-(\w+)/)?.[1] ||
                'plaintext';

              // Debug – remove when you’re happy
              // console.log('HtmlPlugin paste →', { detectedLang, snippet: codeText.slice(0, 50) });

              const codeNode = $createCodeNode();
              codeNode.setLanguage(detectedLang);
              codeNode.append($createTextNode(codeText));
              $insertNodes([codeNode]);
            });
          }
          // ---------- Fallback: normal HTML ----------
          else {
            const nodes = $generateNodesFromDOM(editor, dom);
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
              $insertNodes(nodes);
            } else {
              const root = $getRoot();
              root.clear();
              root.append(...nodes);
            }
          }
        });

        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
};

export default HtmlPlugin;
