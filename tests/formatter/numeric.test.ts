import { describe, it, expect } from "vitest";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { parse } from "../../src/parser/parse.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number | bigint) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error("expected sections");
  return formatNumeric(ast.sections[0], value, enUS);
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
      expect(fmt("###,##0.00", 12345)).toBe("12,345.00");
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
    expect(fmt("0%", 2)).toBe("200%");
    expect(fmt("0 %", 2)).toBe("200 %");
    expect(fmt("%0", 2)).toBe("%200");
    expect(fmt("% 0", 0.5)).toBe("% 50");
  });

  it("renders % at its position relative to digits", () => {
    expect(fmt("%0.00", 0.1234)).toBe("%12.34");
    expect(fmt("0.00%", 0.1234)).toBe("12.34%");
  });

  it("rounds the scaled value", () => {
    expect(fmt("0%", 0.005)).toBe("1%");
    expect(fmt("0.00%", 0.123456)).toBe("12.35%");
  });

  it("handles many digits and grouping", () => {
    expect(fmt("0%", 12.5)).toBe("1250%");
    expect(fmt("0.0%", 1234.5)).toBe("123450.0%");
    expect(fmt("#,##0%", 12.3456)).toBe("1,235%");
    expect(fmt("00.0%", 0.05)).toBe("05.0%");
  });

  it("handles zero", () => {
    expect(fmt("0%", 0)).toBe("0%");
    expect(fmt("#%", 0)).toBe("%");
  });

  it("combines with literals", () => {
    expect(fmt('"discount "0%', 0.25)).toBe("discount 25%");
    expect(fmt('0%" off"', 0.25)).toBe("25% off");
  });
});

describe("formatNumeric — bigint", () => {
  it("digit placeholders behave like number", () => {
    expect(fmt("0", 0n)).toBe("0");
    expect(fmt("0", 5n)).toBe("5");
    expect(fmt("00", 5n)).toBe("05");
    expect(fmt("#", 0n)).toBe("");
    expect(fmt("?", 0n)).toBe(" ");
  });

  it("grouping separator applies", () => {
    expect(fmt("#,##0", 1234567n)).toBe("1,234,567");
    expect(fmt("#,##0", 999n)).toBe("999");
  });

  it("0 decimal placeholders render as zeros", () => {
    expect(fmt("0.00", 5n)).toBe("5.00");
    expect(fmt("0.000", 12n)).toBe("12.000");
    expect(fmt("###,##0.00", 12345n)).toBe("12,345.00");
  });

  it("# decimal placeholders suppress trailing zeros", () => {
    expect(fmt("0.##", 5n)).toBe("5.");
  });

  it("percent multiplies by 100 and supports decimal placeholders", () => {
    expect(fmt("0%", 2n)).toBe("200%");
    expect(fmt("0.00%", 2n)).toBe("200.00%");
  });

  it("preserves precision beyond Number.MAX_SAFE_INTEGER", () => {
    expect(fmt("#,##0", 9007199254740993n)).toBe("9,007,199,254,740,993");
  });
});
