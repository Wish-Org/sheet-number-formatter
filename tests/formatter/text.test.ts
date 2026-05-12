import { describe, it, expect } from "vitest";
import { formatText } from "../../src/formatter/text.js";
import type { FormatSection } from "../../src/parser/types.js";

describe("formatText", () => {
  it("replaces @ with the string value", () => {
    const section: FormatSection = { parts: [{ kind: "text-placeholder" }] };
    expect(formatText(section, "hello")).toBe("hello");
  });

  it("includes literals around @", () => {
    const section: FormatSection = {
      parts: [
        { kind: "literal", value: "[" },
        { kind: "text-placeholder" },
        { kind: "literal", value: "]" },
      ],
    };
    expect(formatText(section, "world")).toBe("[world]");
  });

  it("renders section with no @ as literals only", () => {
    const section: FormatSection = { parts: [{ kind: "literal", value: "N/A" }] };
    expect(formatText(section, "anything")).toBe("N/A");
  });
});
