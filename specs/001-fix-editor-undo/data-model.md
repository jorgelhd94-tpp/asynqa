# Data Model: Reliable Undo/Redo in the Task Runner Editor

**Feature**: 001-fix-editor-undo | **Date**: 2026-06-05

This feature introduces **no persistent data entities** — there are no GORM models,
SQLite tables, or API payloads involved. The only "model" is ephemeral, client-side
editor state. It is documented here for clarity.

## Conceptual entities (ephemeral, in-editor)

### Editing Session

- **What it is**: The lifetime of a single document in the Task Runner editor, scoped to
  one loaded request (`requestId`).
- **Identity**: Bound to `requestId`. A new `requestId` starts a new Editing Session.
- **Lifecycle**: Created when the editor mounts for a request; destroyed when the editor
  unmounts (request switch, or Body↔Options tab switch).

### Undo History

- **What it is**: The ordered stack of document changes within one Editing Session,
  managed entirely by CodeMirror's `history()` state field.
- **Fields (managed by CodeMirror, not by us)**:
  - `undo stack` — changes that can be reverted (`Mod-z`).
  - `redo stack` — changes that can be reapplied (`Mod-y` / `Mod-Shift-z`); discarded when
    a new edit is made.
- **Validation / rules**:
  - One user-meaningful change = one undo step (typing groups naturally; a full-document
    replace from prettify or request load is a single step).
  - History does not cross Editing Session boundaries (enforced by remounting per
    `requestId`).
  - Undo/redo with an empty stack is a no-op.
- **Depth**: CodeMirror default history depth comfortably exceeds the 20+ steps required
  by the spec.

## Relationship to existing persisted state

- The localStorage **draft** (`task-runner-draft.ts`) mirrors the *current* payload text
  for unsaved-change recovery. It is downstream of `onChange` and is **not** an undo
  history; it is unaffected by this change and is intentionally left as-is.
