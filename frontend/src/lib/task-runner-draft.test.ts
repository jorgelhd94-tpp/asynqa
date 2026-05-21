import { describe, it, expect } from "vitest";
import { loadDraft, saveDraft, clearDraft } from "./task-runner-draft";
import type { TaskRunnerFormValues } from "@/components/task-runner/task-runner-form";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    size: () => map.size,
  };
}

const values: TaskRunnerFormValues = {
  queue: "emails",
  taskType: "email:send",
  payload: '{"to":"a@b.c"}',
  maxRetry: "3",
  timeoutSecs: "30",
  delaySecs: "",
};

describe("task-runner draft", () => {
  it("round-trips saved values", () => {
    const s = memoryStorage();
    saveDraft(1, 10, values, s);
    expect(loadDraft(1, 10, s)).toEqual(values);
  });

  it("returns null when there is no draft", () => {
    const s = memoryStorage();
    expect(loadDraft(1, 10, s)).toBeNull();
  });

  it("returns null on corrupt JSON", () => {
    const s = memoryStorage();
    s.setItem("taskrunner-draft:1:10", "{not json");
    expect(loadDraft(1, 10, s)).toBeNull();
  });

  it("clears a draft", () => {
    const s = memoryStorage();
    saveDraft(1, 10, values, s);
    clearDraft(1, 10, s);
    expect(loadDraft(1, 10, s)).toBeNull();
    expect(s.size()).toBe(0);
  });

  it("namespaces by environment and request id", () => {
    const s = memoryStorage();
    saveDraft(1, 10, values, s);
    expect(loadDraft(1, 11, s)).toBeNull(); // different request
    expect(loadDraft(2, 10, s)).toBeNull(); // different environment
    expect(loadDraft(1, 10, s)).toEqual(values);
  });

  it("rejects drafts missing required fields", () => {
    const s = memoryStorage();
    s.setItem("taskrunner-draft:1:10", JSON.stringify({ queue: "x" }));
    expect(loadDraft(1, 10, s)).toBeNull();
  });
});
