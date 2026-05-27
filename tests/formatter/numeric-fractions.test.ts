import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/parse.js";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("fractions", () => {
  it("# ?/? formats 1.5 as 1 1/2", () => {
    expect(fmt("# ?/?", 1.5)).toBe("1 1/2");
  });

  it("# ?/? formats 2.25 as 2 1/4", () => {
    expect(fmt("# ?/?", 2.25)).toBe("2 1/4");
  });

  it("?/? formats 0.5 as 1/2", () => {
    expect(fmt("?/?", 0.5)).toBe("1/2");
  });

  it("# ?/4 uses fixed denominator", () => {
    expect(fmt("# ?/4", 1.5)).toBe("1 2/4");
  });
});
