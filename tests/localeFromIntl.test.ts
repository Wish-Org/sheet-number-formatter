import { describe, it, expect } from "vitest";
import { localeFromIntl } from "../src/locale/localeFromIntl.js";

describe("localeFromIntl", () => {
  it("returns correct separators for en-US", () => {
    const locale = localeFromIntl("en-US");
    expect(locale.decimalSeparator).toBe(".");
    expect(locale.groupSeparator).toBe(",");
  });

  it("returns comma decimal separator for fr-FR", () => {
    const locale = localeFromIntl("fr-FR");
    expect(locale.decimalSeparator).toBe(",");
  });

  it("returns 12 month names", () => {
    const locale = localeFromIntl("en-US");
    expect(locale.monthNames).toHaveLength(12);
    expect(locale.monthNames[0]).toBe("January");
  });

  it("returns locale-specific month names for fr-FR", () => {
    const locale = localeFromIntl("fr-FR");
    expect(locale.monthNames[0].toLowerCase()).toContain("janv");
  });

  it("returns 7 day names starting Sunday", () => {
    const locale = localeFromIntl("en-US");
    expect(locale.dayNames).toHaveLength(7);
    expect(locale.dayNames[0]).toBe("Sunday");
  });

  it("returns AM/PM labels for en-US", () => {
    const locale = localeFromIntl("en-US");
    expect(locale.amLabel.toUpperCase()).toBe("AM");
    expect(locale.pmLabel.toUpperCase()).toBe("PM");
  });
});
