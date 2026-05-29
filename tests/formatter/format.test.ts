import { describe, it, expect } from "vitest";
import { formatValue, parse } from "../../src/formatter/format.js";
import { enUS } from "../../src/locale/enUS.js";

const f = (fmt: string | null, v: Parameters<typeof formatValue>[0]) =>
  formatValue(v, parse(fmt), enUS);

describe("formatValue — general", () => {
  it("formats number with general", () => {
    expect(f(null, 1234.5)).toBe("1234.5");
  });

  it("formats date with general", () => {
    const d = new Date(2024, 2, 15);
    expect(f(null, d)).toBe("15-Mar-2024");
  });
});

describe("formatValue — section selection", () => {
  it("1 section applies to positive", () => {
    expect(f("0", 5)).toBe("5");
  });

  it("1 section applies to negative", () => {
    expect(f("0", -5)).toBe("-5");
  });

  it("2 sections: section 1 for negative", () => {
    expect(f("0;(0)", -5)).toBe("(5)");
  });

  it("3 sections: section 2 for zero", () => {
    expect(f('0;-0;"zero"', 0)).toBe("zero");
  });

  it("conditional section: [>1000] matches", () => {
    expect(f("[>1000]0;0", 5000)).toBe("5000");
  });

  it("conditional section: falls back when no match", () => {
    expect(f("[>1000]0;0", 500)).toBe("500");
  });
});

describe("formatValue — bigint", () => {
  it("formats bigint as number", () => {
    expect(f("0", 12345n)).toBe("12345");
  });
});
