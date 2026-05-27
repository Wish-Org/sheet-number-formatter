import type { FormatSection, FormatPart, DateToken } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

export function formatDateTime(section: FormatSection, date: Date, locale: SheetLocale): string {
  const parts = section.parts;
  const hasAmPm = parts.some(p => p.kind === "date" && (p.token === "ampm" || p.token === "ap"));

  let result = "";
  let prevWasGroup = false;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];

    if (p.kind === "literal") {
      // Replace date separator "/" with locale-specific character
      result += p.value === "/" ? locale.dateSeparator : p.value;
      prevWasGroup = false;
      continue;
    }
    if (p.kind === "padding" || p.kind === "fill") { prevWasGroup = false; continue; }
    if (p.kind === "group") {
      // Consecutive commas in date formats collapse to one literal comma
      if (!prevWasGroup) result += ",";
      prevWasGroup = true;
      continue;
    }
    prevWasGroup = false;
    if (p.kind === "elapsed") { result += formatElapsed(p.unit, p.digits, date); continue; }
    // decimal followed by digit parts = fractional seconds (milliseconds)
    if (p.kind === "decimal") {
      let j = i + 1;
      let digits = 0;
      while (j < parts.length && parts[j].kind === "digit") { digits++; j++; }
      if (digits > 0) {
        result += "." + String(date.getMilliseconds()).padStart(3, "0").slice(0, digits);
        i = j - 1;
      }
      continue;
    }
    if (p.kind !== "date") continue;

    const isMinute = (p.token === "m" || p.token === "mm")
      ? isAdjacentToHourOrSecond(parts, i)
      : false;

    result += formatDateToken(p.token, date, locale, hasAmPm, isMinute, p.lowerCase);
  }
  return result;
}

function isAdjacentToHourOrSecond(parts: FormatPart[], idx: number): boolean {
  for (let j = idx - 1; j >= 0; j--) {
    const p = parts[j];
    if (p.kind === "literal") continue;
    if (p.kind === "date" && (p.token === "h" || p.token === "hh")) return true;
    if (p.kind === "elapsed" && p.unit === "h") return true;
    break;
  }
  for (let j = idx + 1; j < parts.length; j++) {
    const p = parts[j];
    if (p.kind === "literal") continue;
    if (p.kind === "date" && (p.token === "s" || p.token === "ss")) return true;
    break;
  }
  return false;
}

function formatDateToken(
  token: DateToken,
  date: Date,
  locale: SheetLocale,
  hasAmPm: boolean,
  isMinute: boolean,
  lowerCase?: boolean,
): string {
  const y = date.getFullYear();
  const mo = date.getMonth();
  const d = date.getDate();
  const dow = date.getDay();
  const h24 = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const ms = date.getMilliseconds();

  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hour = hasAmPm ? h12 : h24;

  switch (token) {
    case "yyyy": return String(y);
    case "yy":   return String(y).slice(-2);
    case "mmmm": return isMinute ? pad2(min) : locale.monthNames[mo];
    case "mmm":  return isMinute ? pad2(min) : locale.shortMonthNames[mo];
    case "mm":   return isMinute ? pad2(min) : pad2(mo + 1);
    case "m":    return isMinute ? String(min) : String(mo + 1);
    case "dddd": return locale.dayNames[dow];
    case "ddd":  return locale.shortDayNames[dow];
    case "dd":   return pad2(d);
    case "d":    return String(d);
    case "hh":   return pad2(hour);
    case "h":    return String(hour);
    case "ss":   return pad2(sec);
    case "s":    return String(sec);
    case "ampm": return h24 < 12 ? locale.amLabel : locale.pmLabel;
    case "ap": {
      const ch = h24 < 12 ? "a" : "p";
      return lowerCase ? ch : ch.toUpperCase();
    }
    case "fracSeconds": return String(ms).padStart(3, "0");
    default:     return "";
  }
}

function formatElapsed(unit: "h" | "m" | "s", digits: number, date: Date): string {
  const totalMs = date.getTime();
  const negative = totalMs < 0;
  const abs = Math.abs(totalMs);
  let val: number;
  if (unit === "h") val = Math.floor(abs / 3600000);
  else if (unit === "m") val = Math.floor(abs / 60000);
  else val = Math.floor(abs / 1000);
  return (negative ? "-" : "") + String(val).padStart(digits, "0");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
