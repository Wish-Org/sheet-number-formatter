import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS } from "../../src/index.js";

const snf = new SheetNumberFormatter();
const f = (fmt: string, d: Date) => snf.format(d, fmt, enUS);

// Ported from .NET ExcelNumberFormat TestDate

describe("datetime corpus", () => {
  it("d-mmm-yy | 2000-01-01", () =>
    expect(f("d-mmm-yy", new Date(2000, 0, 1))).toBe("1-Jan-00"));

  it("m/d/yyyy h:mm:ss | 2000-01-01 12:34:56", () =>
    expect(f("m/d/yyyy\\ h:mm:ss", new Date(2000, 0, 1, 12, 34, 56))).toBe("1/1/2000 12:34:56"));

  it("yyyy-MMM-dd | 2010-09-26", () =>
    expect(f("yyyy-MMM-dd", new Date(2010, 8, 26))).toBe("2010-Sep-26"));

  it("yyyy-MM-dd | 2010-09-26", () =>
    expect(f("yyyy-MM-dd", new Date(2010, 8, 26))).toBe("2010-09-26"));

  it("mm/dd/yyyy | 2010-09-26", () =>
    expect(f("mm/dd/yyyy", new Date(2010, 8, 26))).toBe("09/26/2010"));

  it("m/d/yy | 2010-09-26", () =>
    expect(f("m/d/yy", new Date(2010, 8, 26))).toBe("9/26/10"));

  it("m/d/yy hh:mm:ss.000 | 2010-09-26 12:34:56.123", () =>
    expect(f("m/d/yy hh:mm:ss.000", new Date(2010, 8, 26, 12, 34, 56, 123))).toBe("9/26/10 12:34:56.123"));

  it("YYYY-MM-DD HH:MM:SS | 2010-09-26 12:34:56", () =>
    expect(f("YYYY-MM-DD HH:MM:SS", new Date(2010, 8, 26, 12, 34, 56, 123))).toBe("2010-09-26 12:34:56"));

  it("m/d/yyyy h:mm:ss AM/PM | 2020-01-01 14:35:55", () =>
    expect(f("m/d/yyyy\\ h:mm:ss AM/PM", new Date(2020, 0, 1, 14, 35, 55))).toBe("1/1/2020 2:35:55 PM"));

  it("m/d/yyyy h:mm:ss | 2020-01-01 14:35:55 (24h)", () =>
    expect(f("m/d/yyyy\\ h:mm:ss", new Date(2020, 0, 1, 14, 35, 55))).toBe("1/1/2020 14:35:55"));

  it("m/d/yyyy hh:mm:ss AM/PM | 2020-01-01 14:35:55", () =>
    expect(f("m/d/yyyy\\ hh:mm:ss AM/PM", new Date(2020, 0, 1, 14, 35, 55))).toBe("1/1/2020 02:35:55 PM"));

  it("m/d/yyyy h:m:s AM/PM | 2020-01-01 16:05:06", () =>
    expect(f("m/d/yyyy\\ h:m:s AM/PM", new Date(2020, 0, 1, 16, 5, 6))).toBe("1/1/2020 4:5:6 PM"));

  it("dddd, MMMM d, yyyy | 2017-10-16", () =>
    expect(f("dddd, MMMM d, yyyy", new Date(2017, 9, 16))).toBe("Monday, October 16, 2017"));

  it("hh:mm:ss AM/PM at midnight | 2020-01-01 00:35:55", () =>
    expect(f("m/d/yyyy\\ hh:mm:ss AM/PM", new Date(2020, 0, 1, 0, 35, 55))).toBe("1/1/2020 12:35:55 AM"));

  it("hh:mm:ss AM/PM at noon | 2020-01-01 12:35:55", () =>
    expect(f("m/d/yyyy\\ hh:mm:ss AM/PM", new Date(2020, 0, 1, 12, 35, 55))).toBe("1/1/2020 12:35:55 PM"));

  it("A/P | 2020-01-01 14:35:55", () =>
    expect(f("m/d/yyyy\\ h:mm:ss A/P", new Date(2020, 0, 1, 14, 35, 55))).toBe("1/1/2020 2:35:55 P"));
});
