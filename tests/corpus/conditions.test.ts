import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS } from "../../src/index.js";

const snf = new SheetNumberFormatter();
const f = (fmt: string, v: number) => {
  const r = snf.compile(fmt);
  if (!r.isSuccess) throw r.errors[0];
  return r.formatter.format(v, enUS);
};

// Ported from .NET ExcelNumberFormat TestCondition

describe("section selection — no conditions", () => {
  it("negative → 2nd section", () =>
    expect(f('"p"0;"m"0;"z"0;"t"@', -1)).toBe("m1"));
  it("zero → 3rd section", () =>
    expect(f('"p"0;"m"0;"z"0;"t"@', 0)).toBe("z0"));
  it("positive → 1st section", () =>
    expect(f('"p"0;"m"0;"z"0;"t"@', 1)).toBe("p1"));
});

describe("conditional sections — two sections", () => {
  it("[<0] matches -1",  () => expect(f('[<0]"LT0";"ELSE"', -1)).toBe("LT0"));
  it("[<0] no match 0",  () => expect(f('[<0]"LT0";"ELSE"', 0)).toBe("ELSE"));
  it("[<0] no match 1",  () => expect(f('[<0]"LT0";"ELSE"', 1)).toBe("ELSE"));

  it("[<=0] matches -1", () => expect(f('[<=0]"LTE0";"ELSE"', -1)).toBe("LTE0"));
  it("[<=0] matches 0",  () => expect(f('[<=0]"LTE0";"ELSE"', 0)).toBe("LTE0"));
  it("[<=0] no match 1", () => expect(f('[<=0]"LTE0";"ELSE"', 1)).toBe("ELSE"));

  it("[>0] no match -1", () => expect(f('[>0]"GT0";"ELSE"', -1)).toBe("ELSE"));
  it("[>0] no match 0",  () => expect(f('[>0]"GT0";"ELSE"', 0)).toBe("ELSE"));
  it("[>0] matches 1",   () => expect(f('[>0]"GT0";"ELSE"', 1)).toBe("GT0"));

  it("[>=0] no match -1",() => expect(f('[>=0]"GTE0";"ELSE"', -1)).toBe("ELSE"));
  it("[>=0] matches 0",  () => expect(f('[>=0]"GTE0";"ELSE"', 0)).toBe("GTE0"));
  it("[>=0] matches 1",  () => expect(f('[>=0]"GTE0";"ELSE"', 1)).toBe("GTE0"));

  it("[=0] no match -1", () => expect(f('[=0]"EQ0";"ELSE"', -1)).toBe("ELSE"));
  it("[=0] matches 0",   () => expect(f('[=0]"EQ0";"ELSE"', 0)).toBe("EQ0"));
  it("[=0] no match 1",  () => expect(f('[=0]"EQ0";"ELSE"', 1)).toBe("ELSE"));

  it("[<>0] matches -1", () => expect(f('[<>0]"NEQ0";"ELSE"', -1)).toBe("NEQ0"));
  it("[<>0] no match 0", () => expect(f('[<>0]"NEQ0";"ELSE"', 0)).toBe("ELSE"));
  it("[<>0] matches 1",  () => expect(f('[<>0]"NEQ0";"ELSE"', 1)).toBe("NEQ0"));
});

describe("TestCondition — conditional section in position 0 ([<0])", () => {
  it('[<0] matches -1 → "p1"', () => expect(f('[<0]"p"0;"m"0;"z"0;"t"@', -1)).toBe("p1"));
  it('[<0] no match 0 → "z0"', () => expect(f('[<0]"p"0;"m"0;"z"0;"t"@',  0)).toBe("z0"));
  it('[<0] no match 1 → "z1"', () => expect(f('[<0]"p"0;"m"0;"z"0;"t"@',  1)).toBe("z1"));
});

describe("TestCondition — conditional section in position 1 ([>0])", () => {
  it('[>0] no match -1 → "-z1"', () => expect(f('"p"0;[>0]"m"0;"z"0;"t"@', -1)).toBe("-z1"));
  it('[>0] no match 0 → "z0"',  () => expect(f('"p"0;[>0]"m"0;"z"0;"t"@',  0)).toBe("z0"));
  it('[>0] matches 1 → "p1"',   () => expect(f('"p"0;[>0]"m"0;"z"0;"t"@',  1)).toBe("p1"));
});

describe("TestCondition — string values (text section @)", () => {
  // API does not yet accept string values — these need format() to accept string
  it.todo('format("Hello", \'"p"0;"m"0;"z"0;"t"@\') → "tHello"');
  it.todo('format("Hello", \'"num"0\') → "Hello" (no text section, pass-through)');
});
