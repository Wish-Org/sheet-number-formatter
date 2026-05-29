import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS, localeFromIntl } from "../../src/index.js";
import type { SheetLocale } from "../../src/index.js";

const snf = new SheetNumberFormatter();
const f = (fmt: string, d: Date | number) => {
  const r = snf.compile(fmt);
  return r.isSuccess ? r.formatter.format(d, enUS) : "";
};
const fl = (fmt: string, v: Date | number, locale: SheetLocale) => {
  const r = snf.compile(fmt);
  if (!r.isSuccess) throw r.errors[0];
  return r.formatter.format(v, locale);
};

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

// ─── case-insensitive AM/PM variants ─────────────────────────────────────────

describe("AM/PM — case-insensitive variants", () => {
  // A/P (uppercase) covered above; these test mixed-case variants
  const d = new Date(2020, 0, 1, 14, 35, 55);
  it("aM/Pm → PM", () => expect(f("m/d/yyyy\\ h:mm:ss aM/Pm",  d)).toBe("1/1/2020 2:35:55 PM"));
  it("am/PM → PM", () => expect(f("m/d/yyyy\\ h:mm:ss am/PM",  d)).toBe("1/1/2020 2:35:55 PM"));
  it("a/P   → p",  () => expect(f("m/d/yyyy\\ h:mm:ss a/P",    d)).toBe("1/1/2020 2:35:55 p"));
  it("A/p   → P",  () => expect(f("m/d/yyyy\\ h:mm:ss A/p",    d)).toBe("1/1/2020 2:35:55 P"));
});

// ─── commas in date formats ───────────────────────────────────────────────────

describe("commas as literal separators in date format", () => {
  it('dddd,,, MMMM d,, yyyy,,,, → "Monday, October 16, 2017,"', () =>
    expect(f("dddd,,, MMMM d,, yyyy,,,,", new Date(2017, 9, 16))).toBe("Monday, October 16, 2017,"));
});

// ─── elapsed duration ────────────────────────────────────────────────────────

describe("elapsed duration — [hh]:mm with numeric serial values", () => {
  it("0   → '00:00'", () => expect(f("[hh]:mm", 0)).toBe("00:00"));
  it("1   → '24:00'", () => expect(f("[hh]:mm", 1)).toBe("24:00"));
  it("1.5 → '36:00'", () => expect(f("[hh]:mm", 1.5)).toBe("36:00"));
});

// ─── isDateTimeFormat (not yet in API) ───────────────────────────────────────

describe("isDateTimeFormat — true for date/time formats", () => {
  it.todo("isDateTimeFormat('dd/mm/yyyy') → true");
  it.todo("isDateTimeFormat('dd-mmm-yy') → true");
  it.todo("isDateTimeFormat('dd-mmmm') → true");
  it.todo("isDateTimeFormat('mmm-yy') → true");
  it.todo("isDateTimeFormat('h:mm AM/PM') → true");
  it.todo("isDateTimeFormat('h:mm:ss AM/PM') → true");
  it.todo("isDateTimeFormat('hh:mm') → true");
  it.todo("isDateTimeFormat('hh:mm:ss') → true");
  it.todo("isDateTimeFormat('dd/mm/yyyy hh:mm') → true");
  it.todo("isDateTimeFormat('mm:ss') → true");
  it.todo("isDateTimeFormat('mm:ss.0') → true");
  it.todo("isDateTimeFormat('[$-809]dd mmmm yyyy') → true");
});

describe("isDateTimeFormat — false for non-date formats", () => {
  it.todo("isDateTimeFormat('#,##0;[Red]-#,##0') → false");
  it.todo("isDateTimeFormat('0_);[Red](0)') → false");
  it.todo("isDateTimeFormat('0\\\\h') → false");
  it.todo('isDateTimeFormat(\'0"h"\') → false');
  it.todo("isDateTimeFormat('0%') → false");
  it.todo("isDateTimeFormat('General') → false");
  it.todo("isDateTimeFormat('_-* #,##0\\\\ _P_t_s_-;...') → false");
});

// ─── serial date conversion (not yet implemented) ────────────────────────────

describe("serial date 1900 mode", () => {
  it.todo('format("0", "dd/mm/yyyy") → "0"  (string, not number)');
  it.todo("format(0,  'dd/mm/yyyy') → '00/01/1900'");
  it.todo("format(1,  'dd/mm/yyyy') → '01/01/1900'");
  it.todo("format(60, 'dd/mm/yyyy') → '29/02/1900'  (Excel leap-year bug)");
  it.todo("format(61, 'dd/mm/yyyy') → '01/03/1900'");
  it.todo("format(43648, \"[$-409]d\\\\-mmm\\\\-yyyy\") → '2-Jul-2019'");
});

describe("serial date 1904 mode", () => {
  it.todo("format(0, 'dd/mm/yyyy', isDate1904=true) → '01/01/1904'");
  it.todo("format(1, 'dd/mm/yyyy', isDate1904=true) → '02/01/1904'");
  it.todo("format(60,'dd/mm/yyyy', isDate1904=true) → '01/03/1904'");
  it.todo("format(61,'dd/mm/yyyy', isDate1904=true) → '02/03/1904'");
});

// ─── date separator as literal ───────────────────────────────────────────────

describe("date separator — / is always a literal", () => {
  const d = new Date(1978, 7, 17);
  it("da-DK: DD/MM/YYYY → '17/08/1978'", () =>
    expect(fl("DD/MM/YYYY", d, localeFromIntl("da-DK"))).toBe("17/08/1978"));
  it("en-US: DD/MM/YYYY → '17/08/1978'", () =>
    expect(fl("DD/MM/YYYY", d, localeFromIntl("en-US"))).toBe("17/08/1978"));
  it("bg-BG: DD/MM/YYYY → '17/08/1978'", () =>
    expect(fl("DD/MM/YYYY", d, localeFromIntl("bg-BG"))).toBe("17/08/1978"));
  it("nb-NO: DD/MM/YYYY → '17/08/1978'", () =>
    expect(fl("DD/MM/YYYY", d, localeFromIntl("nb-NO"))).toBe("17/08/1978"));
});
