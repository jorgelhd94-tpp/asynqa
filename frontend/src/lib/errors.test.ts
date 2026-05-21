import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("returns a raw string as-is (Wails rejects with a string)", () => {
    expect(getErrorMessage("connection failed: dial tcp ...")).toBe(
      "connection failed: dial tcp ...",
    );
  });

  it("reads .message from a real Error object", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("unwraps a JSON-wrapped message", () => {
    expect(getErrorMessage('{"message":"NOAUTH Authentication required."}')).toBe(
      "NOAUTH Authentication required.",
    );
  });

  it("reads .message from a plain object", () => {
    expect(getErrorMessage({ message: "object error" })).toBe("object error");
  });

  it("falls back to 'Unknown error' for null/undefined", () => {
    expect(getErrorMessage(null)).toBe("Unknown error");
    expect(getErrorMessage(undefined)).toBe("Unknown error");
  });

  it("falls back to 'Unknown error' for an empty string", () => {
    expect(getErrorMessage("")).toBe("Unknown error");
  });

  it("stringifies non-string, non-Error values", () => {
    expect(getErrorMessage(42)).toBe("42");
  });
});
