import type { FormatSection, FormatPart } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

type DigitPart = Extract<FormatPart, { kind: "digit" }>;
type SciPart = Extract<FormatPart, { kind: "scientific" }>;

export function formatNumeric(section: FormatSection, absValue: number | bigint, locale: SheetLocale): string {
  const parts = section.parts;

  // Bigint: use string representation to preserve precision; no scaling/percent/fraction/scientific
  if (typeof absValue === "bigint") {
    const intStr = absValue.toString();
    const decimalIdx = parts.findIndex(p => p.kind === "decimal");
    const intParts = decimalIdx === -1 ? parts : parts.slice(0, decimalIdx);
    const scalingCommas = countScalingCommas(parts);
    const hasGrouping = (parts.filter(p => p.kind === "group").length - scalingCommas) > 0;
    const intFormatted = formatInteger(intStr, intParts, hasGrouping, locale);
    return wrapWithLiterals(parts, intFormatted);
  }

  if (parts.some(p => p.kind === "scientific")) {
    return formatScientific(absValue, parts, locale);
  }

  if (parts.some(p => p.kind === "literal" && p.value === "/")) {
    return formatFractionDisplay(absValue, parts, locale);
  }

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
    fracFormatted = locale.decimalSeparator + formatDecimalFraction(fracRaw, fracDigits);
  }

  let numeric = intFormatted + fracFormatted;
  if (hasPercent) numeric += "%";

  return wrapWithLiterals(parts, numeric);
}

// ── Scientific notation ──────────────────────────────────────────────────────

function formatScientific(absValue: number, parts: FormatPart[], locale: SheetLocale): string {
  const sciIdx = parts.findIndex(p => p.kind === "scientific");
  const sciPart = parts[sciIdx] as SciPart;
  const decimalIdx = parts.findIndex(p => p.kind === "decimal");

  const intDigits = (decimalIdx === -1 ? parts.slice(0, sciIdx) : parts.slice(0, decimalIdx))
    .filter(p => p.kind === "digit") as DigitPart[];
  const fracDigits = (decimalIdx === -1 ? [] : parts.slice(decimalIdx + 1, sciIdx)
    .filter(p => p.kind === "digit")) as DigitPart[];

  const groupSize = Math.max(intDigits.length, 1);
  const decimalPlaces = fracDigits.length;

  let exp = 0;
  let mantissa = absValue;

  if (absValue !== 0) {
    const rawExp = Math.floor(Math.log10(absValue));
    exp = Math.floor(rawExp / groupSize) * groupSize;
    mantissa = absValue / Math.pow(10, exp);
  }

  const factor = Math.pow(10, decimalPlaces);
  const roundedMantissa = Math.round((mantissa + Number.EPSILON) * factor) / factor;

  const intStr = Math.floor(roundedMantissa).toString();
  const zeroCount = intDigits.filter(d => d.char === "0").length;
  const mantissaInt = intStr.padStart(zeroCount, "0");

  let mantissaFrac = "";
  if (decimalPlaces > 0) {
    mantissaFrac = locale.decimalSeparator + (roundedMantissa % 1).toFixed(decimalPlaces).slice(2);
  }

  const expSign = exp < 0 ? "-" : (sciPart.forceSign ? "+" : "");
  const expStr = Math.abs(exp).toString().padStart(sciPart.digits.length, "0");

  return mantissaInt + mantissaFrac + "E" + expSign + expStr;
}

// ── Fraction display ─────────────────────────────────────────────────────────

function formatFractionDisplay(absValue: number, parts: FormatPart[], locale: SheetLocale): string {
  const slashIdx = parts.findIndex(p => p.kind === "literal" && p.value === "/");

  // Collect numerator digits (consecutive digits immediately before "/")
  const numeratorDigits: DigitPart[] = [];
  let i = slashIdx - 1;
  while (i >= 0 && parts[i].kind === "digit") {
    numeratorDigits.unshift(parts[i] as DigitPart);
    i--;
  }

  // Skip any non-digit separators (e.g. space literal) then collect whole-number digits
  while (i >= 0 && parts[i].kind !== "digit") i--;
  const wholeDigits: DigitPart[] = [];
  while (i >= 0 && parts[i].kind === "digit") {
    wholeDigits.unshift(parts[i] as DigitPart);
    i--;
  }

  // Denominator: digit placeholders OR a fixed integer literal
  let denomFixed: number | null = null;
  const denomDigits: DigitPart[] = [];
  let j = slashIdx + 1;
  if (j < parts.length && parts[j].kind === "literal") {
    const n = parseInt((parts[j] as Extract<FormatPart, { kind: "literal" }>).value, 10);
    if (!isNaN(n)) denomFixed = n;
  } else {
    while (j < parts.length && parts[j].kind === "digit") {
      denomDigits.push(parts[j] as DigitPart);
      j++;
    }
  }

  const hasWhole = wholeDigits.length > 0;
  const wholeVal = hasWhole ? Math.floor(absValue) : 0;
  const fracVal = hasWhole ? absValue - wholeVal : absValue;

  let num: number, den: number;
  if (denomFixed !== null) {
    den = denomFixed;
    num = Math.round(fracVal * den);
  } else {
    const maxDen = Math.pow(10, denomDigits.length) - 1;
    [num, den] = bestFraction(fracVal, maxDen);
  }

  // Format whole number
  let result = "";
  if (hasWhole) {
    const wholeStr = wholeVal.toString();
    const wholeZeros = wholeDigits.filter(d => d.char === "0").length;
    const wholeHashCount = wholeDigits.filter(d => d.char === "#").length;
    const wholePadded = wholeStr.padStart(wholeZeros, "0");
    if (parseInt(wholePadded, 10) === 0 && wholeZeros === 0 && wholeHashCount > 0) {
      result = "";
    } else {
      result = wholePadded;
    }

    // Collect separator literals between whole and numerator
    let k = wholeDigits.length > 0 ? i + 1 : 0;
    // Find literals between last whole digit position and first numerator digit
    const sepStart = parts.indexOf(wholeDigits[wholeDigits.length - 1] as FormatPart) + 1;
    const sepEnd = parts.indexOf(numeratorDigits[0] as FormatPart);
    for (let s = sepStart; s < sepEnd; s++) {
      if (parts[s].kind === "literal") result += (parts[s] as Extract<FormatPart, { kind: "literal" }>).value;
    }
  }

  // Format numerator
  const numStr = num.toString();
  const numZeros = numeratorDigits.filter(d => d.char === "0").length;
  result += numStr.padStart(numZeros, "0");

  result += "/";

  // Format denominator
  if (denomFixed !== null) {
    result += den.toString();
  } else {
    const denStr = den.toString();
    const denZeros = denomDigits.filter(d => d.char === "0").length;
    result += denStr.padStart(denZeros, "0");
  }

  return result;
}

function bestFraction(frac: number, maxDen: number): [number, number] {
  let bestNum = 0, bestDen = 1;
  let bestErr = Math.abs(frac);
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(frac * d);
    const err = Math.abs(frac - n / d);
    if (err < bestErr) {
      bestErr = err;
      bestNum = n;
      bestDen = d;
    }
  }
  return [bestNum, bestDen];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  if (digitParts.length === 0) return "";
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

function formatDecimalFraction(fracStr: string, parts: DigitPart[]): string {
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
