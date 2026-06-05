# Quickstart: Validate Reliable Undo/Redo in the Task Runner Editor

**Feature**: 001-fix-editor-undo | **Date**: 2026-06-05

## Unit test (fast, no app run)

```bash
cd frontend
npm run test -- json-editor
```

Expect the undo-wiring test to pass: a document change produces `undoDepth > 0` and
`undo` reverts the change. (On the unfixed code this test fails because history is absent.)

## Manual validation (real app)

```bash
wails dev
```

1. Open an environment → **Task Runner** and select/create a request so the JSON payload
   editor is visible (Body tab).
2. **US1 — single undo reliability**: Type some text in the payload, press **Ctrl+Z**
   (Cmd+Z on macOS). The typed text is removed. Repeat ~20 times (type → undo). It must
   work **every** time — no dead presses. *(SC-001)*
3. **US2 — multi-step undo**: Make three distinct edits (A, B, C). Press Ctrl+Z three
   times; the document walks back C→B→A to the pre-A state. One more Ctrl+Z does nothing
   (no error). *(SC-002, FR-008)*
4. **US3 — redo**: After undoing, press **Ctrl+Y** (and **Ctrl+Shift+Z** / Cmd+Shift+Z);
   the undone edits are reapplied. Then make a new edit and press redo — nothing is
   reapplied. *(SC-003)*
5. **Prettify = one step**: Enter minified JSON (e.g. `{"a":1,"b":2}`), click **Prettify**,
   then press **Ctrl+Z once** — the document returns to the exact pre-prettify text in a
   single step. *(SC-004, FR-006)*
6. **Paste = one step**: Paste a block of JSON, press Ctrl+Z once — the whole paste is
   removed in one step. *(FR-005)*
7. **Fresh history per request (FR-007)**: Edit request A, switch to a different saved
   request B, then press Ctrl+Z — it must **not** bring back request A's content.

## Pass criteria

- All 7 steps behave as described.
- The reported "sometimes it undoes, sometimes it doesn't" no longer reproduces.
- No regressions to syntax highlighting, line numbers, Tab indentation, Send/Save
  shortcuts, or the unsaved-draft indicator.
