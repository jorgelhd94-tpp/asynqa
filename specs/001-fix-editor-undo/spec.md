# Feature Specification: Reliable Undo/Redo in the Task Runner Editor

**Feature Branch**: `001-fix-editor-undo`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "En el editor del Task Runner, el atajo Ctrl+Z (deshacer) no funciona de forma confiable: a veces deshace, a veces no."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliably undo my last edit (Priority: P1)

A developer is composing a task payload in the Task Runner editor. After making a
change they don't want (a wrong value, an accidental deletion, a bad paste), they
press the undo shortcut (Ctrl+Z, or Cmd+Z on macOS) and expect their last change to
be reverted — every time, not just sometimes.

**Why this priority**: This is the reported defect. Unreliable undo erodes trust in
the editor and risks the developer enqueuing a task with content they thought they had
reverted. Fixing this single behavior restores a usable editing experience and is a
viable standalone improvement.

**Independent Test**: In the Task Runner editor, type or delete text, press the undo
shortcut, and confirm the last change is reverted. Repeat many times in a row and
confirm it works on every attempt with no "dead" presses.

**Acceptance Scenarios**:

1. **Given** the editor has focus and the user has just typed a value, **When** they
   press Ctrl+Z, **Then** the typed value is removed and the document returns to its
   prior state.
2. **Given** the user deleted a block of text, **When** they press Ctrl+Z, **Then** the
   deleted text is restored.
3. **Given** the user pasted content, **When** they press Ctrl+Z, **Then** the pasted
   content is removed in a single step.
4. **Given** the same editing state, **When** the user presses Ctrl+Z repeatedly under
   identical conditions, **Then** the result is the same every time (no flakiness).

---

### User Story 2 - Step back through multiple edits (Priority: P2)

The developer made several edits in a row and wants to walk back through them, undoing
more than just the most recent change.

**Why this priority**: Single-level undo alone is a partial fix; real editing involves
multiple changes, and users expect undo to keep going. It builds directly on US1.

**Independent Test**: Make several distinct edits, then press the undo shortcut multiple
times and confirm each press reverts the next-most-recent edit in reverse order until
the document returns to its starting content.

**Acceptance Scenarios**:

1. **Given** the user made edits A, then B, then C, **When** they press undo three times,
   **Then** the document returns through C→B→A to the state before A.
2. **Given** the user has undone everything, **When** they press undo again, **Then**
   nothing changes and no error occurs.

---

### User Story 3 - Redo an undone edit (Priority: P3)

After undoing one or more changes, the developer decides they wanted them after all and
reapplies them with a redo shortcut.

**Why this priority**: Redo is the natural companion to undo and rounds out the editing
experience, but the absence of redo is less severe than the core undo defect.

**Independent Test**: Undo one or more edits, press the redo shortcut (Ctrl+Y, or
Ctrl+Shift+Z / Cmd+Shift+Z), and confirm the undone edits are reapplied in order.

**Acceptance Scenarios**:

1. **Given** the user undid an edit, **When** they press the redo shortcut, **Then** the
   edit is reapplied and the document returns to the state before the undo.
2. **Given** the user undid an edit and then made a new edit, **When** they press redo,
   **Then** nothing is reapplied (the redo branch was discarded by the new edit).

---

### Edge Cases

- **Prettify / format**: When the user applies the editor's prettify/format action, a
  single undo MUST revert that formatting as one step, not character-by-character.
- **Loading a different saved request**: Loading another saved request (or otherwise
  replacing the whole document) starts a fresh editing session — undo MUST NOT reach back
  into the content of a previously loaded request.
- **Nothing to undo/redo**: Pressing undo or redo when there is nothing to revert/reapply
  is a harmless no-op with no error.
- **Focus**: The shortcuts act on the Task Runner editor when it has focus; they do not
  hijack undo/redo for unrelated parts of the app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Task Runner editor MUST revert the user's most recent edit when the
  undo shortcut (Ctrl+Z / Cmd+Z) is pressed while the editor has focus.
- **FR-002**: Undo MUST be reliable and deterministic — given the same editor state, the
  result of pressing undo MUST be the same on every attempt, with no presses that do
  nothing when a prior edit exists.
- **FR-003**: Repeated undo MUST step backward through the full sequence of edits made in
  the current editing session, in reverse order.
- **FR-004**: The editor MUST support redo (Ctrl+Y and Ctrl+Shift+Z / Cmd+Shift+Z) to
  reapply the most recently undone edit, until a new edit discards the redo branch.
- **FR-005**: Undo/redo MUST behave consistently regardless of how the content changed —
  typing, deleting, pasting, or applying prettify/format.
- **FR-006**: A programmatic content change that represents one user-initiated action
  (e.g. prettify) MUST be undoable as a single step.
- **FR-007**: Replacing the entire document by loading a different request MUST begin a
  new undo session; undo MUST NOT cross into the previously loaded document's content.
- **FR-008**: When there is nothing to undo or redo, the shortcut MUST be a no-op — no
  error and no unexpected change to the content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across 20 consecutive undo presses (each following an edit), the last edit
  is reverted 100% of the time — the reported "sometimes it does, sometimes it doesn't"
  behavior no longer reproduces.
- **SC-002**: A user can step back through at least the last 20 edits in a session via
  repeated undo, in correct reverse order.
- **SC-003**: After undoing, the user can reapply edits with redo, recovering the exact
  content that was undone.
- **SC-004**: Applying prettify and then pressing undo once returns the document to its
  exact pre-prettify content in a single step.

## Assumptions

- Undo/redo follow standard desktop conventions: Ctrl on Windows/Linux, Cmd on macOS;
  redo is available via both Ctrl+Y and Ctrl+Shift+Z (Cmd+Shift+Z on macOS).
- "Editing session" means the lifetime of the current document in the editor; loading a
  different saved request starts a new session and a fresh undo history.
- Scope is limited to the Task Runner payload editor; other inputs in the app are out of
  scope for this change.
- A generous undo depth (at least the last 20+ edits) is sufficient; unbounded history is
  not required.
