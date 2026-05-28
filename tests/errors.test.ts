import { describe, it, expect } from "vitest";
import { ParseError } from "../src/errors.js";

describe("ParseError", () => {
  it("is an instance of ParseError", () => {
    const err = new ParseError("bad token", "0.0@", 3);
    expect(err).toBeInstanceOf(ParseError);
  });

  it("exposes formatString and position", () => {
    const err = new ParseError("bad token", "0.0@", 3);
    expect(err.formatString).toBe("0.0@");
    expect(err.position).toBe(3);
  });

  it("includes position and format string in message", () => {
    const err = new ParseError("Unexpected character", "0.0@", 3);
    expect(err.message).toContain("0.0@");
    expect(err.message).toContain("3");
  });
});
