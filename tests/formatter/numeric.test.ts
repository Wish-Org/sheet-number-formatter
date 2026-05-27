import { describe, it, expect } from "vitest";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { parse } from "../../src/parser/parse.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error("expected sections");
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("formatNumeric — digit placeholders", () => {
  it("0 pads integer to at least 1 digit", () => {
    expect(fmt("0", 0)).toBe("0");
    expect(fmt("0", 5)).toBe("5");
  });

  it("00 pads to 2 digits", () => {
    expect(fmt("00", 5)).toBe("05");
    expect(fmt("00", 15)).toBe("15");
  });

  it("# shows nothing for zero leading digit", () => {
    expect(fmt("#", 0)).toBe("");
    expect(fmt("#", 5)).toBe("5");
  });

  it("? pads with space for missing digit", () => {
    expect(fmt("?", 0)).toBe(" ");
    expect(fmt("?", 5)).toBe("5");
  });
});

describe("formatNumeric — decimal", () => {
  it("0.00 formats to 2 decimal places", () => {
    expect(fmt("0.00", 1.5)).toBe("1.50");
    expect(fmt("0.00", 1.005)).toBe("1.01");
  });

  it("0.## omits trailing zeros", () => {
    expect(fmt("0.##", 1.5)).toBe("1.5");
    expect(fmt("0.##", 1)).toBe("1.");
  });
});

describe("formatNumeric — grouping", () => {
  it("#,##0 adds thousands separator", () => {
    expect(fmt("#,##0", 1234567)).toBe("1,234,567");
    expect(fmt("#,##0", 999)).toBe("999");
  });

  it("###,##0.00 formats correctly", () => {
    expect(fmt("###,##0.00", 12345.6)).toBe("12,345.60");
  });
});

describe("formatNumeric — scaling", () => {
  it("0, scales by 1000", () => {
    expect(fmt("0,", 1000000)).toBe("1000");
  });

  it("0.0,, scales by 1000000", () => {
    expect(fmt("0.0,,", 1500000)).toBe("1.5");
  });
});

describe("formatNumeric — percent", () => {
  it("0% multiplies by 100 and appends %", () => {
    expect(fmt("0%", 0.5)).toBe("50%");
    expect(fmt("0.00%", 0.1234)).toBe("12.34%");
  });
});
