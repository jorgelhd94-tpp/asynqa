# Research: Reliable Undo/Redo in the Task Runner Editor

**Feature**: 001-fix-editor-undo | **Date**: 2026-06-05

There were no open `NEEDS CLARIFICATION` items from the spec. Research focused on the
single technical unknown: why CodeMirror undo is unreliable here and the correct fix.

## Decision 1 — Add CodeMirror's `history()` + `historyKeymap`

**Decision**: Add the `history()` state field to the editor's extensions and include
`historyKeymap` in the editor's keymap, both from `@codemirror/commands`.

**Root cause**: In CodeMirror 6, undo/redo is not part of `defaultKeymap`. The bindings
(`Mod-z` → `undo`, `Mod-y` and `Mod-Shift-z` → `redo`) live in `historyKeymap`, and those
commands require the `history()` state field to be installed. The current editor uses
`keymap.of([indentWithTab, ...defaultKeymap])` and never adds `history()` or
`historyKeymap`. So Ctrl+Z is unbound inside CodeMirror and the keystroke bubbles to the
browser, where contentEditable native undo behaves inconsistently — exactly the reported
"sometimes works, sometimes not."

**Rationale**: This is the idiomatic, documented CodeMirror 6 way to provide undo/redo.
It restores deterministic behavior (FR-002), multi-step history (FR-003), and redo
(FR-004). `historyKeymap` uses `Mod-`, which maps to Ctrl on Windows/Linux and Cmd on
macOS, satisfying cross-platform parity (Principle V) for free.

**Alternatives considered**:
- *Bind undo/redo manually to custom keys*: more code, duplicates what `historyKeymap`
  already provides, and risks missing platform variants. Rejected.
- *Rely on the browser's native undo*: this is the current (broken) behavior. Rejected.

## Decision 2 — Keymap precedence: history before defaults

**Decision**: Order the keymap as `[indentWithTab, ...historyKeymap, ...defaultKeymap]`.

**Rationale**: CodeMirror resolves keybindings in array order. Listing `historyKeymap`
explicitly (and before `defaultKeymap`) guarantees the undo/redo bindings are active and
take precedence, with no ambiguity about which binding wins.

**Alternatives considered**: Appending `historyKeymap` after `defaultKeymap` also works
since the keys don't collide, but leading with it is clearer about intent. Minor.

## Decision 3 — One undo session per loaded request (FR-007)

**Decision**: The parent renders `<JsonEditor key={requestId} … />` so switching to a
different saved request remounts the editor with a fresh `EditorState` (and therefore an
empty undo history). Prettify and ordinary typing do **not** change `requestId`, so they
stay within the same session.

**Root cause / context**: The editor view is created once (`useEffect([])`) and persists;
external `value` changes are applied via a single full-document replace transaction. With
`history()` added, that single transaction is exactly one undoable step — which is what we
want for **prettify** (FR-006). But without remounting, undo could also step back into the
*previous* request's content after a request switch, violating FR-007. Keying on
`requestId` cleanly bounds each request's history.

**Rationale**: `key`-based remount is the idiomatic React way to reset component-local
state on identity change. It needs no CodeMirror history-reset plumbing and keeps the
prettify-as-one-step behavior intact.

**Alternatives considered**:
- *Dispatch a history-clearing transaction on request change*: CodeMirror has no simple
  "clear history" effect; reconfiguring the field from inside the value-sync effect is
  more fragile than a remount. Rejected.
- *Do nothing for FR-007*: would let undo cross request boundaries. Rejected.

**Known limitation (out of scope)**: The editor lives inside a Radix Tabs panel that
unmounts inactive content, so switching Body↔Options tabs already resets editor history.
This predates the bug and is consistent with the spec's "editing session = lifetime of the
current document in the editor" assumption; not addressed here.

## Decision 4 — Testability via a pure extensions factory

**Decision**: Extract the editor's extension list into a pure exported factory (e.g.
`createJsonEditorExtensions()`) so a Vitest can build an `EditorState` from it, apply a
change, and assert `undoDepth(state) > 0` and that `undo` reverts the document — no DOM
required.

**Rationale**: Satisfies Principle III (a test that reproduces the defect: with the old
extension set `undoDepth` stays 0; with the fix it becomes > 0). Fast, deterministic, and
guards against a future regression that drops `history()`.

**Alternatives considered**: A full jsdom render of `JsonEditor` driving real key events
is heavier, slower, and flakier than asserting on `EditorState`. Rejected for the unit
test (manual validation in quickstart.md covers the real-DOM path).
