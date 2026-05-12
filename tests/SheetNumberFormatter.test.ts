import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS, localeFromIntl, ParseError } from "../src/index.js";

const snf = new SheetNumberFormatter();

describe("SheetNumberFormatter.format", () => {
  it("formats a number", () => {
    expect(snf.format(12345.6, "###,##0.00", enUS)).toBe("12,345.60");
  });

  it("formats a date", () => {
    const d = new Date(2024, 2, 15);
    expect(snf.format(d, "yyyy-mm-dd", enUS)).toBe("2024-03-15");
  });

  it("formats a bigint", () => {
    expect(snf.format(9007199254740993n, "0", enUS)).toBe("9007199254740993");
  });

  it("throws ParseError for invalid format", () => {
    expect(() => snf.format(1, '"unclosed', enUS)).toThrow(ParseError);
  });
});

describe("SheetNumberFormatter.compile", () => {
  it("returns a CompiledFormatter that formats correctly", () => {
    const compiled = snf.compile("0.00");
    expect(compiled.format(1.5, enUS)).toBe("1.50");
    expect(compiled.format(2.0, enUS)).toBe("2.00");
  });
});

describe("exports", () => {
  it("exports enUS locale", () => {
    expect(enUS.decimalSeparator).toBe(".");
  });

  it("exports localeFromIntl", () => {
    const loc = localeFromIntl("en-US");
    expect(loc.decimalSeparator).toBe(".");
  });

  it("exports ParseError", () => {
    const err = new ParseError("test", "0", 0);
    expect(err).toBeInstanceOf(Error);
  });
});
