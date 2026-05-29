import type { SheetLocale } from "./types.js";

export function localeFromIntl(tag: string): SheetLocale {
  const numFmt = new Intl.NumberFormat(tag);
  const parts = numFmt.formatToParts(1234567.89);
  const decimalSeparator = parts.find(p => p.type === "decimal")?.value ?? ".";
  const rawGroup = parts.find(p => p.type === "group")?.value ?? ",";
  // Older ICU (Node 20 LTS on Linux) returns U+0027 (') for de-CH; normalize to U+2019 (')
  const groupSeparator = rawGroup === "'" ? "’" : rawGroup;

  const monthNames: string[] = [];
  const shortMonthNames: string[] = [];
  const singleLetterMonthNames: string[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2000, m, 1);
    monthNames.push(new Intl.DateTimeFormat(tag, { month: "long" }).format(d));
    shortMonthNames.push(new Intl.DateTimeFormat(tag, { month: "short" }).format(d));
    singleLetterMonthNames.push(new Intl.DateTimeFormat(tag, { month: "narrow" }).format(d));
  }

  const dayNames: string[] = [];
  const shortDayNames: string[] = [];
  for (let d = 0; d < 7; d++) {
    // 2000-01-02 is a Sunday
    const date = new Date(2000, 0, 2 + d);
    dayNames.push(new Intl.DateTimeFormat(tag, { weekday: "long" }).format(date));
    shortDayNames.push(new Intl.DateTimeFormat(tag, { weekday: "short" }).format(date));
  }

  const timeFmt = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true });
  const amParts = timeFmt.formatToParts(new Date(2000, 0, 1, 6));
  const pmParts = timeFmt.formatToParts(new Date(2000, 0, 1, 18));
  const amLabel = amParts.find(p => p.type === "dayPeriod")?.value ?? "AM";
  const pmLabel = pmParts.find(p => p.type === "dayPeriod")?.value ?? "PM";
  const shortAmLabel = (amLabel[0] ?? "A").toUpperCase();
  const shortPmLabel = (pmLabel[0] ?? "P").toUpperCase();

  return {
    decimalSeparator,
    groupSeparator,
    monthNames,
    shortMonthNames,
    singleLetterMonthNames,
    dayNames,
    shortDayNames,
    amLabel,
    pmLabel,
    shortAmLabel,
    shortPmLabel,
  };
}
