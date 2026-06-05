# Implementation Plan: Reliable Undo/Redo in the Task Runner Editor

**Branch**: `001-fix-editor-undo` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fix-editor-undo/spec.md`

## Summary

The Task Runner payload editor ([frontend/src/components/task-runner/json-editor.tsx](../../frontend/src/components/task-runner/json-editor.tsx))
is a CodeMirror 6 instance whose extension set omits the editor's own undo
history. As a result Ctrl+Z is not handled by CodeMirror and falls through to the
browser's native contentEditable undo, which is unreliable — the reported "sometimes
it undoes, sometimes it doesn't". The fix is to give CodeMirror ownership of undo/redo
by adding the `history()` state field and the `historyKeymap` bindings, and to scope
each loaded request to its own undo session. No new dependencies are required.

## Technical Context

**Language/Version**: TypeScript 5 / React 19 (frontend only — no Go backend change)

**Primary Dependencies**: CodeMirror 6 — `@codemirror/state`, `@codemirror/view`,
`@codemirror/commands` (already at ^6.10.3, provides `history`/`historyKeymap`),
`@codemirror/lang-json`. No dependency added.

**Storage**: N/A. Undo history is ephemeral in-editor state. The existing localStorage
draft mirror ([frontend/src/lib/task-runner-draft.ts](../../frontend/src/lib/task-runner-draft.ts))
is unaffected.

**Testing**: Vitest (`cd frontend && npm run test`). The CodeMirror extension set is
extracted into a pure factory so undo wiring can be asserted without a real DOM.

**Target Platform**: Windows, Linux, macOS desktop (Wails v2 webview).

**Project Type**: Desktop app (Go + embedded React frontend). This change is
frontend-only.

**Performance Goals**: Undo/redo feel instantaneous (no perceptible delay); history
depth covers at least the last 20+ edits per session.

**Constraints**: No new npm dependency (reuse installed `@codemirror/commands`); keep
the editor controlled (`value`/`onChange`) so prettify and request loading keep working;
the undo shortcut must work with Ctrl (Windows/Linux) and Cmd (macOS).

**Scale/Scope**: One component refactor + one parent wiring change + one unit test.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|-----------|------------|
| I. Asynq-First Scope | ✅ Editing task payloads is core asynq workflow; no scope drift. |
| II. Backend Purity & Testable Units | ✅ N/A (frontend-only). Spirit honored: editor extensions extracted to a pure factory so logic is testable without DOM. |
| III. Pragmatic Test-First | ✅ A Vitest reproduces the defect at the unit level: build state from the factory, apply a change, assert `undoDepth > 0` and that `undo` reverts. Written before the wiring fix. |
| IV. Secure Credential Handling | ✅ N/A — no credentials, logging, or persistence touched. |
| V. Cross-Platform Parity | ✅ `Mod-` bindings (`historyKeymap`) resolve Ctrl on Win/Linux and Cmd on macOS automatically. |
| VI. UI Consistency & Reuse | ✅ Extends the existing editor; no parallel component system; generated Wails bindings untouched. |
| VII. Structured Observability | ✅ N/A (frontend-only). |

**Result**: PASS — no violations, Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-editor-undo/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (UI/keyboard contract)
│   └── editor-undo.md
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── components/
│       └── task-runner/
│           ├── json-editor.tsx           # MODIFIED: add history() + historyKeymap;
│           │                             #   extract extensions into a pure factory
│           ├── json-editor.test.ts       # NEW: Vitest for undo history wiring
│           └── task-runner-form.tsx      # MODIFIED: key={requestId} on <JsonEditor>
│                                         #   so each loaded request gets a fresh
│                                         #   undo session (FR-007)
```

**Structure Decision**: Single-component frontend change. The undo defect is isolated to
the editor's extension configuration; the only adjacent change is the parent giving the
editor a `key` per request so undo history does not bleed across loaded requests.

## Complexity Tracking

> No constitution violations — section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
