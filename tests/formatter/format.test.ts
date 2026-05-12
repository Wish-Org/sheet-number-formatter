import { describe, it, expect } from "vitest";
import { formatValue } from "../../src/formatter/format.js";
import { enUS } from "../../src/locale/enUS.js";

describe("formatValue — general", () => {
  it("formats number with general", () => {
    const result = formatValue(1234.5, null, enUS);
    expect(result).toBe("1234.5");
  });

  it("formats date with general", () => {
    const d = new Date(2024, 2, 15);
    expect(formatValue(d, null, enUS)).toBe("15-Mar-2024");
  });

  it("formats string with general", () => {
    expect(formatValue("hello", null, enUS)).toBe("hello");
  });
});

describe("formatValue — section selection", () => {
  it("1 section applies to positive", () => {
    expect(formatValue(5, "0", enUS)).toBe("5");
  });

  it("1 section applies to negative", () => {
    expect(formatValue(-5, "0", enUS)).toBe("-5");
  });

  it("2 sections: section 1 for negative", () => {
    expect(formatValue(-5, "0;(0)", enUS)).toBe("(5)");
  });

  it("3 sections: section 2 for zero", () => {
    expect(formatValue(0, "0;-0;zero", enUS)).toBe("zero");
  });

  it("4 sections: section 3 for text", () => {
    // \[ and \] are escaped literals; @ is the text placeholder
    expect(formatValue("foo", String.raw`0;-0;0;\[@\]`, enUS)).toBe("[foo]");
  });

  it("conditional section: [>1000] matches", () => {
    expect(formatValue(5000, "[>1000]0;0", enUS)).toBe("5000");
  });

  it("conditional section: falls back when no match", () => {
    expect(formatValue(500, "[>1000]0;0", enUS)).toBe("500");
  });
});

describe("formatValue — bigint", () => {
  it("formats bigint as number", () => {
    expect(formatValue(12345n, "0", enUS)).toBe("12345");
  });
});
