---
description: "Task list for reliable undo/redo in the Task Runner editor"
---

# Tasks: Reliable Undo/Redo in the Task Runner Editor

**Input**: Design documents from `/specs/001-fix-editor-undo/`

**Prerequisites**: plan.md (required), spec.md (user stories), research.md, data-model.md,
contracts/editor-undo.md, quickstart.md

**Tests**: INCLUDED. The plan and Constitution Principle III (Pragmatic Test-First) call
for a regression test that reproduces the defect, written before the wiring fix.

**Organization**: Tasks are grouped by user story. The core fix (Phase 3 / US1) delivers
the undo engine; US2 and US3 lock the multi-step and redo behaviors with additional unit
assertions; cross-cutting handles per-request history scoping and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1/US2/US3 maps to the user stories in spec.md
- Exact file paths are included in every task

## Path Conventions

Frontend-only change. Paths are relative to the repository root; the editor lives under
`frontend/src/components/task-runner/`.

---

## Phase 1: Setup

**Purpose**: Confirm prerequisites; no dependency changes are required.

- [X] T001 Verify `@codemirror/commands` (^6.10.3, already in `frontend/package.json`)
  exposes `history`, `historyKeymap`, `undo`, `redo`, `undoDepth`, and `redoDepth`, and
  that `cd frontend && npm run test` runs the Vitest suite. No npm install needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the editor configuration testable so the fix can be verified without a
real DOM. **⚠️ Blocks all user stories.**

- [X] T002 Refactor `frontend/src/components/task-runner/json-editor.tsx`: extract the
  `extensions: [ … ]` array from the editor-creation `useEffect` into a pure, exported
  factory `createJsonEditorExtensions()` and have `EditorState.create({ extensions: … })`
  consume it. No behavior change in this task (history not added yet).

**Checkpoint**: Extensions are importable as a pure function — user-story work can begin.

---

## Phase 3: User Story 1 - Reliably undo my last edit (Priority: P1) 🎯 MVP

**Goal**: Pressing Ctrl/Cmd+Z reliably and deterministically reverts the last edit.

**Independent Test**: Build an `EditorState` from the factory, apply a change, and confirm
undo reverts it; manually, type→undo ~20× in the editor with zero dead presses.

### Tests for User Story 1 ⚠️ (write first, must FAIL before T004)

- [X] T003 [P] [US1] Add `frontend/src/components/task-runner/json-editor.test.ts`:
  create an `EditorState` from `createJsonEditorExtensions()`, apply an insert transaction,
  assert `undoDepth(state) > 0`, and assert that applying `undo` returns the document to its
  original text. This test FAILS on the current extension set (no history).

### Implementation for User Story 1

- [X] T004 [US1] In `createJsonEditorExtensions()` (`frontend/src/components/task-runner/json-editor.tsx`)
  add `history()` to the extensions and include `historyKeymap` in the keymap as
  `keymap.of([indentWithTab, ...historyKeymap, ...defaultKeymap])`, importing `history` and
  `historyKeymap` from `@codemirror/commands`. This makes T003 pass (GREEN).

**Checkpoint**: Single-step undo works reliably and deterministically — MVP complete.

---

## Phase 4: User Story 2 - Step back through multiple edits (Priority: P2)

**Goal**: Repeated undo walks back through the session's edits in reverse order.

**Independent Test**: Apply several distinct changes, then undo repeatedly and confirm the
document returns through each prior state to the start; one extra undo is a no-op.

### Tests for User Story 2 ⚠️

- [X] T005 [P] [US2] Extend `frontend/src/components/task-runner/json-editor.test.ts`
  with a multi-step case: apply two separate change transactions, assert two `undo` calls
  walk back to the original document in reverse order, and that a further `undo` with an
  empty stack is a no-op (FR-003, FR-008). Behavior is delivered by T004; this test locks it.

**Checkpoint**: Multi-step undo is verified.

---

## Phase 5: User Story 3 - Redo an undone edit (Priority: P3)

**Goal**: Redo reapplies undone edits until a new edit discards the redo branch.

**Independent Test**: Undo a change, redo it, confirm it returns; then make a new edit and
confirm redo no longer reapplies anything.

### Tests for User Story 3 ⚠️

- [X] T006 [P] [US3] Extend `frontend/src/components/task-runner/json-editor.test.ts`
  with a redo case: after an `undo`, assert `redo` reapplies the change (via document text
  and `redoDepth`), and that making a new change discards the redo branch (FR-004).
  Behavior is delivered by T004; this test locks it.

**Checkpoint**: Redo is verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Scope history per request and validate the whole feature end-to-end.

- [X] T007 [P] Scope undo history per loaded request: in
  `frontend/src/components/task-runner/task-runner-form.tsx`, render the editor as
  `<JsonEditor key={requestId} value={payload} onChange={setPayload} />` so loading a
  different saved request remounts the editor with a fresh undo session (FR-007). Confirm
  Prettify and Reset do not change `requestId`, so they remain one undo step (FR-006).
- [X] T008 Run `cd frontend && npm run test` (all green) and `npm run build` to confirm no
  type or build regressions.
- [ ] T009 Manual validation per `specs/001-fix-editor-undo/quickstart.md` under
  `wails dev` — all 7 steps: single-undo reliability (×20), multi-step undo, redo,
  prettify = one step, paste = one step, and fresh history after switching requests.

---

## Dependencies & Execution Order

- **Setup (T001)**: No dependencies — start immediately.
- **Foundational (T002)**: Depends on T001. **Blocks T003–T006** (they import the factory).
- **US1 (T003 → T004)**: T003 (failing test) before T004 (fix). Depends on T002.
- **US2 (T005)** and **US3 (T006)**: Depend on T004 (the history engine) and on the test
  file from T003 existing. Independent of each other.
- **T007** (per-request scoping): Touches a different file (`task-runner-form.tsx`); depends
  only on the editor having usable history (T004 recommended first for coherent validation,
  but the edit itself is independent).
- **T008** (test + build): After all code tasks (T004, T005, T006, T007).
- **T009** (manual validation): Last, after T008.

```text
T001 → T002 → T003 → T004 → (T005, T006, T007) → T008 → T009
```

## Parallel Opportunities

- After T004, the additional unit assertions and the parent wiring are parallelizable since
  T005/T006 edit the test file and T007 edits a different component — but note T005 and T006
  both append to `json-editor.test.ts`; if done by separate agents, serialize the two test
  edits to avoid a same-file conflict. T007 is freely parallel with the test work.

```bash
# Safe parallel batch after T004 (different files):
Task: "T007 add key={requestId} to <JsonEditor> in task-runner-form.tsx"
# T005 and T006 both touch json-editor.test.ts — run them sequentially.
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. T001 Setup → T002 Foundational (factory).
2. T003 failing undo test → T004 add `history()` + `historyKeymap`.
3. **STOP and VALIDATE**: type→undo repeatedly in the running app; the reported flakiness
   is gone. This alone is a shippable fix for the reported bug.

### Incremental Delivery

1. MVP (US1) → reliable single undo.
2. US2 → lock multi-step undo (test).
3. US3 → lock redo (test).
4. Polish → per-request history scoping (T007) + full test/build + manual quickstart.

## Notes

- [P] = different files, no dependency on an incomplete task.
- The core engine fix is a single change (T004); US2/US3 are verification increments since
  CodeMirror's `history()` provides multi-step undo and redo together.
- Commit after each task or logical group.
- Verify T003 FAILS before implementing T004 (true red→green).
