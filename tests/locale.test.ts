import { describe, it, expect } from "vitest";
import { enUS } from "../src/locale/enUS.js";

describe("enUS locale", () => {
  it("has correct separators", () => {
    expect(enUS.decimalSeparator).toBe(".");
    expect(enUS.groupSeparator).toBe(",");
    expect(enUS.dateSeparator).toBe("/");
  });

  it("has 12 month names", () => {
    expect(enUS.monthNames).toHaveLength(12);
    expect(enUS.monthNames[0]).toBe("January");
    expect(enUS.monthNames[11]).toBe("December");
  });

  it("has 12 short month names", () => {
    expect(enUS.shortMonthNames).toHaveLength(12);
    expect(enUS.shortMonthNames[0]).toBe("Jan");
  });

  it("has 12 single-letter month names", () => {
    expect(enUS.singleLetterMonthNames).toHaveLength(12);
    expect(enUS.singleLetterMonthNames[0]).toBe("J");
  });

  it("has 7 day names starting Sunday", () => {
    expect(enUS.dayNames).toHaveLength(7);
    expect(enUS.dayNames[0]).toBe("Sunday");
    expect(enUS.dayNames[6]).toBe("Saturday");
  });

  it("has 7 short day names", () => {
    expect(enUS.shortDayNames).toHaveLength(7);
    expect(enUS.shortDayNames[0]).toBe("Sun");
  });

  it("has AM/PM labels", () => {
    expect(enUS.amLabel).toBe("AM");
    expect(enUS.pmLabel).toBe("PM");
  });
});
