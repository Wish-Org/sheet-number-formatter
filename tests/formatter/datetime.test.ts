import { describe, it, expect } from "vitest";
import { formatDateTime } from "../../src/formatter/datetime.js";
import { parse } from "../../src/parser/parse.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, date: Date) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatDateTime(ast.sections[0], date, enUS);
}

// Fixed reference date: 2024-03-15 14:05:09.123 (Friday)
const D = new Date(2024, 2, 15, 14, 5, 9, 123);
const MIDNIGHT = new Date(2024, 2, 15, 0, 0, 0);
const NOON = new Date(2024, 2, 15, 12, 0, 0);

describe("formatDateTime", () => {
  it("yyyy formats 4-digit year", () => expect(fmt("yyyy", D)).toBe("2024"));
  it("yy formats 2-digit year", () => expect(fmt("yy", D)).toBe("24"));

  it("mmmm formats full month name", () => expect(fmt("mmmm", D)).toBe("March"));
  it("mmm formats abbreviated month", () => expect(fmt("mmm", D)).toBe("Mar"));
  it("mm formats zero-padded month", () => expect(fmt("mm", D)).toBe("03"));
  it("m formats month without padding", () => expect(fmt("m", D)).toBe("3"));

  it("dddd formats full weekday", () => expect(fmt("dddd", D)).toBe("Friday"));
  it("ddd formats abbreviated weekday", () => expect(fmt("ddd", D)).toBe("Fri"));
  it("dd formats zero-padded day", () => expect(fmt("dd", D)).toBe("15"));
  it("d formats day without padding", () => expect(fmt("d", D)).toBe("15"));

  it("hh formats zero-padded 24h hour", () => expect(fmt("hh", D)).toBe("14"));
  it("h formats 24h hour without padding", () => expect(fmt("h", D)).toBe("14"));

  it("hh AM/PM formats 12-hour with padding", () => expect(fmt("hh AM/PM", D)).toBe("02 PM"));
  it("h AM/PM at midnight shows 12", () => expect(fmt("h AM/PM", MIDNIGHT)).toBe("12 AM"));
  it("h AM/PM at noon shows 12 PM", () => expect(fmt("h AM/PM", NOON)).toBe("12 PM"));

  it("mm as minute after hh", () => expect(fmt("hh:mm", D)).toBe("14:05"));
  it("ss formats zero-padded seconds", () => expect(fmt("ss", D)).toBe("09"));

  it("full datetime format", () => {
    expect(fmt("yyyy-mm-dd hh:mm:ss", D)).toBe("2024-03-15 14:05:09");
  });

  it("d-mmm-yy format", () => {
    expect(fmt("d-mmm-yy", D)).toBe("15-Mar-24");
  });

  it("A/P formats as A or P", () => {
    expect(fmt("h A/P", D)).toBe("2 P");
    expect(fmt("h A/P", MIDNIGHT)).toBe("12 A");
  });
});
