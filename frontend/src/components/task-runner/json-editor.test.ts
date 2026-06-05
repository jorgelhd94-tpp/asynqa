import { describe, it, expect } from "vitest";
import { EditorState, Transaction, type StateCommand } from "@codemirror/state";
import { undo, redo, undoDepth, redoDepth, isolateHistory } from "@codemirror/commands";
import { createJsonEditorExtensions } from "./json-editor";

function stateWithDoc(doc: string): EditorState {
  return EditorState.create({ doc, extensions: createJsonEditorExtensions() });
}

/**
 * Apply a document change as a discrete, undoable user event. `isolateHistory`
 * forces a history boundary so each call is its own undo step — deterministically
 * standing in for edits a real user separates in time (CodeMirror otherwise merges
 * adjacent typing into one group, which would make step counts timing-dependent).
 */
function edit(
  state: EditorState,
  spec: { from: number; to?: number; insert?: string },
  userEvent = "input.type"
): EditorState {
  return state.update({
    changes: spec,
    userEvent,
    annotations: isolateHistory.of("full"),
  }).state;
}

/** Run a StateCommand (undo/redo) and return the resulting state. */
function run(command: StateCommand, state: EditorState): EditorState {
  let next = state;
  command({
    state,
    dispatch: (tr: Transaction) => {
      next = tr.state;
    },
  });
  return next;
}

describe("Task Runner editor undo/redo wiring", () => {
  it("records an undoable step and reverts the last typed edit (US1)", () => {
    let state = stateWithDoc("a");
    state = edit(state, { from: 1, insert: "b" }); // "ab"
    expect(state.doc.toString()).toBe("ab");
    expect(undoDepth(state)).toBeGreaterThan(0);

    state = run(undo, state);
    expect(state.doc.toString()).toBe("a");
  });

  it("reverts a deletion as well as an insertion (US1, FR-005)", () => {
    let state = stateWithDoc("hello");
    state = edit(state, { from: 0, to: 5, insert: "" }, "delete.selection"); // ""
    expect(state.doc.toString()).toBe("");

    state = run(undo, state);
    expect(state.doc.toString()).toBe("hello");
  });

  it("steps back through multiple edits in reverse order (US2, FR-003/FR-008)", () => {
    let state = stateWithDoc("");
    state = edit(state, { from: 0, insert: "A" }, "input.type"); // "A"
    state = edit(state, { from: 1, insert: "B" }, "delete.cut.then"); // "AB" (distinct event)
    state = edit(state, { from: 2, insert: "C" }, "input.paste"); // "ABC"
    expect(undoDepth(state)).toBe(3);

    state = run(undo, state);
    expect(state.doc.toString()).toBe("AB");
    state = run(undo, state);
    expect(state.doc.toString()).toBe("A");
    state = run(undo, state);
    expect(state.doc.toString()).toBe("");

    // Nothing left to undo -> no-op (FR-008)
    expect(undoDepth(state)).toBe(0);
    const after = run(undo, state);
    expect(after.doc.toString()).toBe("");
  });

  it("redoes an undone edit and discards the redo branch on a new edit (US3, FR-004/FR-008)", () => {
    let state = stateWithDoc("x");
    state = edit(state, { from: 1, insert: "y" }); // "xy"

    state = run(undo, state); // "x"
    expect(state.doc.toString()).toBe("x");
    expect(redoDepth(state)).toBeGreaterThan(0);

    state = run(redo, state); // "xy"
    expect(state.doc.toString()).toBe("xy");

    // Undo, then a NEW edit must discard the redo branch.
    state = run(undo, state); // "x"
    state = edit(state, { from: 1, insert: "z" }); // "xz"
    expect(redoDepth(state)).toBe(0);
    const after = run(redo, state); // no-op
    expect(after.doc.toString()).toBe("xz");
  });
});
