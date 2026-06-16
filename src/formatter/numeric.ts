import type { FormatSection, FormatPart } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

type DigitPart = Extract<FormatPart, { kind: "digit" }>;
type SciPart = Extract<FormatPart, { kind: "scientific" }>;

export function formatNumeric(section: FormatSection, absValue: number | bigint, locale: SheetLocale): string {
  const parts = section.parts;

  // Bigint: use string representation to preserve precision; no scaling/percent/fraction/scientific
  if (typeof absValue === "bigint") {
    const hasPercent = parts.some(p => p.kind === "percent");
    const scaledValue = hasPercent ? absValue * 100n : absValue;
    const intStr = scaledValue.toString();
    const decimalIdx = parts.findIndex(p => p.kind === "decimal");
    const intParts = decimalIdx === -1 ? parts : parts.slice(0, decimalIdx);
    const scalingCommas = countScalingCommas(parts);
    const hasGrouping = (parts.filter(p => p.kind === "group").length - scalingCommas) > 0;
    const intFormatted = formatInteger(intStr, intParts, hasGrouping, locale);
    let fracFormatted = "";
    if (decimalIdx !== -1) {
      const fracDigits = parts.slice(decimalIdx + 1).filter(p => p.kind === "digit") as DigitPart[];
      fracFormatted = locale.decimalSeparator + formatDecimalFraction("0".repeat(fracDigits.length), fracDigits);
    }
    const numeric = intFormatted + fracFormatted;
    return wrapWithLiterals(parts, numeric);
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

  const intStr = intToDecimalString(Math.floor(Math.abs(rounded)));

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

  const numeric = intFormatted + fracFormatted;

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

function formatFractionDisplay(absValue: number, parts: FormatPart[], _locale: SheetLocale): string {
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

  // Denominator: digit placeholders OR a fixed integer literal.
  // Fixed: starts with a numeric literal char (1-9), may be followed by "0" digit tokens.
  //   e.g. /16 → literal("1")+literal("6"), /10 → literal("1")+digit("0"), /100 → literal("1")+digit("0")+digit("0")
  // Variable: starts with "?", "#", or "0" digit tokens (format placeholders).
  let denomFixed: number | null = null;
  const denomDigits: DigitPart[] = [];
  let j = slashIdx + 1;
  const startsWithNumericLiteral = j < parts.length &&
    parts[j].kind === "literal" &&
    /^\d+$/.test((parts[j] as Extract<FormatPart, { kind: "literal" }>).value);
  if (startsWithNumericLiteral) {
    let fixedStr = "";
    while (j < parts.length) {
      const p = parts[j];
      if (p.kind === "literal" && /^\d+$/.test((p as Extract<FormatPart, { kind: "literal" }>).value)) {
        fixedStr += (p as Extract<FormatPart, { kind: "literal" }>).value;
        j++;
      } else if (p.kind === "digit" && (p as DigitPart).char === "0") {
        fixedStr += "0";
        j++;
      } else {
        break;
      }
    }
    const n = parseInt(fixedStr, 10);
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
    const sepStart = parts.indexOf(wholeDigits[wholeDigits.length - 1] as FormatPart) + 1;
    const sepEnd = parts.indexOf(numeratorDigits[0] as FormatPart);
    for (let s = sepStart; s < sepEnd; s++) {
      if (parts[s].kind === "literal") result += (parts[s] as Extract<FormatPart, { kind: "literal" }>).value;
    }

    // When fraction is zero, fill fraction section with spaces instead of showing 0/1
    if (num === 0) {
      const numWidth = numeratorDigits.length;
      const denWidth = denomFixed !== null
        ? den.toString().length
        : denomDigits.length;
      result += " ".repeat(numWidth + 1 + denWidth);
      return result;
    }
  }

  // Format numerator with ? left-padding (right-align) and 0 zero-padding
  const numZeros = numeratorDigits.filter(d => d.char === "0").length;
  const numSpaces = numeratorDigits.filter(d => d.char === "?").length;
  const numWidth = numZeros + numSpaces;
  const numStr = num.toString().padStart(numZeros, "0");
  if (numSpaces > 0 && numStr.length < numWidth) {
    result += " ".repeat(numWidth - numStr.length) + numStr;
  } else {
    result += numStr;
  }

  result += "/";

  // Format denominator with 0 zero-padding and ? right-padding (left-align)
  if (denomFixed !== null) {
    result += den.toString();
  } else {
    const denZeros = denomDigits.filter(d => d.char === "0").length;
    const denSpaces = denomDigits.filter(d => d.char === "?").length;
    const denWidth = denZeros + denSpaces;
    const denStr = den.toString().padStart(denZeros, "0");
    if (denSpaces > 0 && denStr.length < denWidth) {
      result += denStr + " ".repeat(denWidth - denStr.length);
    } else {
      result += denStr;
    }
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

// Convert a non-negative integer-valued number to a plain decimal string.
// Numbers >= 1e21 stringify in exponential notation (e.g. "3.5e+22"); BigInt
// expands them to full digits so the integer formatter sees real digits.
function intToDecimalString(n: number): string {
  if (n < 1e21) return n.toString();
  return BigInt(n).toString();
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

  if (spaceCount > 0) {
    const minWidth = zeroCount + spaceCount;
    if (s.length < minWidth) s = " ".repeat(minWidth - s.length) + s;
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
      p.kind === "group" || p.kind === "scientific";
    if (isNumeric) {
      inNumericZone = true;
    } else if (p.kind === "literal") {
      if (!inNumericZone) before += p.value;
      else after += p.value;
    } else if (p.kind === "percent") {
      // The percent sign renders at its literal position (e.g. "%0" → "%200").
      if (!inNumericZone) before += "%";
      else after += "%";
    }
  }

  return before + numeric + after;
}
