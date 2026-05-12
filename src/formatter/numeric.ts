import type { FormatSection, FormatPart } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

type DigitPart = Extract<FormatPart, { kind: "digit" }>;

export function formatNumeric(section: FormatSection, absValue: number, locale: SheetLocale): string {
  const parts = section.parts;

  const scalingCommas = countScalingCommas(parts);
  let value = absValue / Math.pow(1000, scalingCommas);

  const hasPercent = parts.some(p => p.kind === "percent");
  if (hasPercent) value *= 100;

  const decimalIdx = parts.findIndex(p => p.kind === "decimal");
  const intParts = decimalIdx === -1 ? parts : parts.slice(0, decimalIdx);
  const fracDigits = decimalIdx === -1
    ? []
    : (parts.slice(decimalIdx + 1).filter(p => p.kind === "digit") as DigitPart[]);

  const decimalPlaces = fracDigits.length;
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;

  const intStr = Math.floor(Math.abs(rounded)).toString();

  const totalGroups = parts.filter(p => p.kind === "group").length;
  const hasGrouping = (totalGroups - scalingCommas) > 0;

  const intFormatted = formatInteger(intStr, intParts, hasGrouping, locale);

  let fracFormatted = "";
  if (decimalIdx !== -1) {
    const fracRaw = decimalPlaces > 0
      ? (Math.abs(rounded) % 1).toFixed(decimalPlaces).slice(2)
      : "";
    fracFormatted = locale.decimalSeparator + formatFraction(fracRaw, fracDigits);
  }

  let numeric = intFormatted + fracFormatted;
  if (hasPercent) numeric += "%";

  return wrapWithLiterals(parts, numeric);
}

function countScalingCommas(parts: FormatPart[]): number {
  let count = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.kind === "group") { count++; continue; }
    if (p.kind === "digit" || p.kind === "decimal") break;
  }
  return count;
}

function formatInteger(intStr: string, intParts: FormatPart[], hasGrouping: boolean, locale: SheetLocale): string {
  const digitParts = intParts.filter(p => p.kind === "digit") as DigitPart[];
  const zeroCount = digitParts.filter(p => p.char === "0").length;
  const hashCount = digitParts.filter(p => p.char === "#").length;
  const spaceCount = digitParts.filter(p => p.char === "?").length;

  let s = intStr.padStart(zeroCount, "0");

  if (hasGrouping) {
    s = addGroupSeparator(s, locale.groupSeparator);
  }

  if (parseInt(s.replace(/,/g, ""), 10) === 0 && zeroCount === 0) {
    if (spaceCount > 0) return " ".repeat(spaceCount);
    if (hashCount > 0) return "";
  }

  return s;
}

function addGroupSeparator(intStr: string, sep: string): string {
  let result = "";
  const len = intStr.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) result += sep;
    result += intStr[i];
  }
  return result;
}

function formatFraction(fracStr: string, parts: DigitPart[]): string {
  const significantLen = fracStr.replace(/0+$/, "").length;
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const digit = fracStr[i] ?? "0";
    if (parts[i].char === "0") {
      result += digit;
    } else if (i >= significantLen) {
      result += parts[i].char === "?" ? " " : "";
    } else {
      result += digit;
    }
  }
  return result;
}

function wrapWithLiterals(parts: FormatPart[], numeric: string): string {
  let before = "";
  let after = "";
  let inNumericZone = false;

  for (const p of parts) {
    const isNumeric = p.kind === "digit" || p.kind === "decimal" ||
      p.kind === "group" || p.kind === "percent" || p.kind === "scientific";
    if (isNumeric) {
      inNumericZone = true;
    } else if (p.kind === "literal") {
      if (!inNumericZone) before += p.value;
      else after += p.value;
    }
  }

  return before + numeric + after;
}
