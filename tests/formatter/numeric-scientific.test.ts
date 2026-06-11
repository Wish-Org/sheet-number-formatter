import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/parse.js";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("scientific notation", () => {
  it("#0.0E+0 formats 12300 correctly", () => {
    // groupSize=2, exponent=floor(log10(12300)/2)*2=4, mantissa=1.23→1.2
    expect(fmt("#0.0E+0", 12300)).toBe("1.2E+4");
  });

  it("0.00E+00 formats 0.00123 correctly", () => {
    expect(fmt("0.00E+00", 0.00123)).toBe("1.23E-03");
  });

  it("##0.0E+0 formats 1230000 correctly", () => {
    expect(fmt("##0.0E+0", 1230000)).toBe("1.2E+6");
  });
});

describe("large numbers without scientific format", () => {
  it("0 does not use scientific notation for numbers >= 1e21", () => {
    expect(fmt("0", 35260653000268690400000)).toBe("35260653000268691013632");
  });

  it("#,##0 groups large numbers without scientific notation", () => {
    expect(fmt("#,##0", 1e21)).toBe("1,000,000,000,000,000,000,000");
  });
});
