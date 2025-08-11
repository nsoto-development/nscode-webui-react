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

            const preElements = dom.querySelectorAll('pre');

            if (preElements.length > 0) {
              preElements.forEach((preElement) => {
                const codeText = preElement.textContent;
                const codeNode = $createCodeNode();
                codeNode.setTextContent(codeText);
                $insertNodes([codeNode]);
              });
            } else {
              // Fallback to the default HTML paste for other rich content
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
        }
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor]);

  return null;
};

export default HtmlPlugin;