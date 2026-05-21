/**
 * Extracts a human-readable message from an unknown error value.
 *
 * Wails v2 rejects binding promises with the Go error *string* (see the runtime's
 * `calls.js`: `callbackData.reject(message.error)`), not an `Error` object. Reading
 * `error.message` on that string yields `undefined`, which is why connection failures
 * showed an empty message. This helper normalizes every shape we can receive:
 * raw strings (Wails), real `Error` objects, and JSON-wrapped messages.
 */
export function getErrorMessage(error: unknown): string {
  if (error == null) return "Unknown error";

  let raw: string;
  if (typeof error === "string") {
    raw = error;
  } else if (error instanceof Error) {
    raw = error.message;
  } else if (typeof error === "object" && "message" in error) {
    raw = String((error as { message: unknown }).message);
  } else {
    raw = String(error);
  }

  // Some backend errors are wrapped as JSON like {"message": "..."}.
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    // not JSON — use the raw string as-is
  }

  return raw || "Unknown error";
}
