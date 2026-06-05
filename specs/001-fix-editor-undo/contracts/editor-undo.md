# UI Contract: Task Runner Editor Undo/Redo

**Feature**: 001-fix-editor-undo | **Date**: 2026-06-05

This is a UI/keyboard behavior contract for the `JsonEditor` component, not a network API.

## Component contract — `JsonEditor`

**Props** (unchanged):

| Prop | Type | Meaning |
|------|------|---------|
| `value` | `string` | Controlled document text (the JSON payload). |
| `onChange` | `(value: string) => void` | Fired on every document change with the new text. |

**Mounting contract** (parent responsibility):

- The parent MUST render the editor with `key={requestId}` so that loading a different
  saved request remounts the editor and starts a fresh undo session (FR-007).
- Prettify and reset MUST update `value` **without** changing `requestId`, so they remain
  part of the current undo session (FR-006).

## Keyboard contract (when the editor has focus)

| Keys | Action | Requirement |
|------|--------|-------------|
| `Ctrl+Z` (Win/Linux), `Cmd+Z` (macOS) | Undo | Reverts the most recent change deterministically (FR-001, FR-002). |
| Repeated `Ctrl/Cmd+Z` | Multi-step undo | Steps back through the session's changes in reverse order (FR-003). |
| `Ctrl+Y` (Win/Linux), `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo | Reapplies the most recently undone change until a new edit discards the redo branch (FR-004). |
| Undo/redo with empty stack | No-op | No error, no content change (FR-008). |

## Behavioral guarantees

1. Undo/redo are owned by the editor (CodeMirror history), never delegated to the
   browser's native contentEditable undo. Identical editor state ⇒ identical undo result.
2. A single full-document replacement (prettify, reset, request load) counts as exactly
   one undo step.
3. Undo history is bounded to the current editing session and does not reach into a
   previously loaded request's content.
4. Existing behavior is preserved: controlled `value`/`onChange`, JSON syntax
   highlighting, line numbers, `Tab` indentation, and localStorage draft mirroring.

## Verification hooks

- **Unit (Vitest)**: build an `EditorState` from the exported extensions factory, apply a
  change transaction, assert `undoDepth(state) > 0`, then assert `undo` returns the
  document to its prior text. (With the pre-fix extension set, `undoDepth` stays `0` — this
  is the regression guard.)
- **Manual**: see [quickstart.md](../quickstart.md).
