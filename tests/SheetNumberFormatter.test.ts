import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS, localeFromIntl, ParseError } from "../src/index.js";

const snf = new SheetNumberFormatter();

describe("SheetNumberFormatter.compile — success", () => {
  it("formats a number", () => {
    const result = snf.compile("###,##0.00");
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.formatter.format(12345.6, enUS)).toBe("12,345.60");
  });

  it("formats a date", () => {
    const result = snf.compile("yyyy-mm-dd");
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.formatter.format(new Date(2024, 2, 15), enUS)).toBe("2024-03-15");
  });

  it("formats a bigint", () => {
    const result = snf.compile("0");
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) expect(result.formatter.format(9007199254740993n, enUS)).toBe("9007199254740993");
  });

  it("reuses compiled formatter efficiently", () => {
    const result = snf.compile("0.00");
    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.formatter.format(1.5, enUS)).toBe("1.50");
      expect(result.formatter.format(2.0, enUS)).toBe("2.00");
    }
  });
});

describe("SheetNumberFormatter.compile — failure", () => {
  it("returns isSuccess false for invalid format", () => {
    const result = snf.compile('"unclosed');
    expect(result.isSuccess).toBe(false);
    if (!result.isSuccess) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(ParseError);
    }
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
    expect(err).toBeInstanceOf(ParseError);
  });
});
