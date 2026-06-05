import { useRef, useEffect } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, lineNumbers, keymap } from "@codemirror/view";
import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";

// Override oneDark to match the app's color scheme
const themeOverrides = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
  },
  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: "0.75rem",
    lineHeight: "20px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-primary-contrast)",
    borderRight: "1px solid var(--color-divider)",
    color: "var(--color-text-muted)",
    fontSize: "10px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  ".cm-activeLine": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
});

const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--color-accent-light)" },
  { tag: tags.string, color: "var(--color-success)" },
  { tag: tags.number, color: "#d19a66" },
  { tag: tags.bool, color: "#c678dd" },
  { tag: tags.null, color: "#c678dd" },
  { tag: tags.punctuation, color: "var(--color-text-muted)" },
]);

// The editor's static extension set, extracted as a pure factory so undo/redo
// wiring can be unit-tested against an EditorState without a real DOM.
// Component-specific glue (the change listener) is appended by the component.
export function createJsonEditorExtensions(): Extension[] {
  return [
    lineNumbers(),
    json(),
    oneDark,
    themeOverrides,
    syntaxHighlighting(highlightStyle),
    history(),
    keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap]),
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
  ];
}

type JsonEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [...createJsonEditorExtensions(), updateListener],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full flex-1 overflow-hidden" />;
}