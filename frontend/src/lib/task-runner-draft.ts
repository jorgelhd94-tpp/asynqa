import type { TaskRunnerFormValues } from "@/components/task-runner/task-runner-form";

/**
 * Per-request draft persistence for the task runner form.
 *
 * The form holds its state in local component state, which is destroyed when
 * the route unmounts (e.g. the user navigates to inspect a queue or another
 * task). To avoid losing in-progress edits we mirror them to localStorage,
 * keyed by environment + saved-request id, and restore them on return.
 *
 * Storage is injectable so the logic can be unit-tested without a DOM.
 */

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const FIELDS: (keyof TaskRunnerFormValues)[] = [
  "queue",
  "taskType",
  "payload",
  "maxRetry",
  "timeoutSecs",
  "delaySecs",
];

function draftKey(environmentId: number, requestId: number): string {
  return `taskrunner-draft:${environmentId}:${requestId}`;
}

function getStorage(storage?: DraftStorage): DraftStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Fired on the window whenever a draft is created or cleared, so views that
 * reflect draft state (e.g. the sidebar's per-request indicator) can refresh
 * without polling localStorage. `storage` events only fire across tabs, not
 * within the same window, so we dispatch our own.
 */
export const DRAFT_CHANGE_EVENT = "taskrunner-draft-change";

function notifyDraftChange(injected?: DraftStorage): void {
  // Only signal for the real shared store; injected storage is test-only.
  if (injected) return;
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(DRAFT_CHANGE_EVENT));
    }
  } catch {
    // ignore — best-effort notification
  }
}

export function saveDraft(
  environmentId: number,
  requestId: number,
  values: TaskRunnerFormValues,
  storage?: DraftStorage,
): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.setItem(draftKey(environmentId, requestId), JSON.stringify(values));
    notifyDraftChange(storage);
  } catch {
    // storage full or unavailable — drafts are best-effort
  }
}

/**
 * Returns whether a saved request currently has an unsaved draft mirrored to
 * storage. Cheap presence check used to render the sidebar draft indicator.
 */
export function hasDraft(
  environmentId: number,
  requestId: number,
  storage?: DraftStorage,
): boolean {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    return store.getItem(draftKey(environmentId, requestId)) !== null;
  } catch {
    return false;
  }
}

export function loadDraft(
  environmentId: number,
  requestId: number,
  storage?: DraftStorage,
): TaskRunnerFormValues | null {
  const store = getStorage(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(draftKey(environmentId, requestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Only accept a draft that has every field as a string, so an outdated or
    // tampered entry can't feed undefined into controlled inputs.
    for (const field of FIELDS) {
      if (typeof parsed[field] !== "string") return null;
    }
    return parsed as TaskRunnerFormValues;
  } catch {
    return null;
  }
}

export function clearDraft(
  environmentId: number,
  requestId: number,
  storage?: DraftStorage,
): void {
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.removeItem(draftKey(environmentId, requestId));
    notifyDraftChange(storage);
  } catch {
    // ignore
  }
}
