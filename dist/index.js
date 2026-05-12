// src/errors.ts
var ParseError = class extends Error {
  constructor(message, formatString, position) {
    super(`${message} at position ${position} in "${formatString}"`);
    this.formatString = formatString;
    this.position = position;
    this.name = "ParseError";
  }
};

// src/parser/lexer.ts
var DATE_TOKENS = ["yyyy", "yy", "mmmm", "mmm", "mm", "m", "dddd", "ddd", "dd", "d", "hh", "h", "ss", "s"];
function tokenize(fmt) {
  const tokens = [];
  let i = 0;
  while (i < fmt.length) {
    const pos = i;
    const ch = fmt[i];
    if (ch === '"') {
      i++;
      let value = "";
      while (i < fmt.length && fmt[i] !== '"') value += fmt[i++];
      if (i >= fmt.length) throw new ParseError("Unclosed quoted string", fmt, pos);
      i++;
      tokens.push({ type: "literal", value, pos });
      continue;
    }
    if (ch === "\\") {
      i++;
      if (i < fmt.length) tokens.push({ type: "literal", value: fmt[i++], pos });
      continue;
    }
    if (ch === "[") {
      i++;
      const bracketPos = pos;
      let inner = "";
      while (i < fmt.length && fmt[i] !== "]") inner += fmt[i++];
      if (i >= fmt.length) throw new ParseError("Unclosed bracket", fmt, bracketPos);
      i++;
      const lc = inner.toLowerCase();
      if (/^h+$/.test(lc)) {
        tokens.push({ type: "elapsed", unit: "h", pos: bracketPos });
        continue;
      }
      if (/^m+$/.test(lc)) {
        tokens.push({ type: "elapsed", unit: "m", pos: bracketPos });
        continue;
      }
      if (/^s+$/.test(lc)) {
        tokens.push({ type: "elapsed", unit: "s", pos: bracketPos });
        continue;
      }
      if (inner.startsWith("$")) {
        const dashIdx = inner.indexOf("-", 1);
        const symbol = dashIdx === -1 ? inner.slice(1) : inner.slice(1, dashIdx);
        tokens.push({ type: "currency", symbol, pos: bracketPos });
        continue;
      }
      const condMatch = inner.match(/^(>=|<=|<>|>|<|=)(-?\d+(?:\.\d+)?)$/);
      if (condMatch) {
        tokens.push({
          type: "condition",
          operator: condMatch[1],
          value: parseFloat(condMatch[2]),
          pos: bracketPos
        });
        continue;
      }
      tokens.push({ type: "color", value: inner, pos: bracketPos });
      continue;
    }
    if ((ch === "E" || ch === "e") && i + 1 < fmt.length && (fmt[i + 1] === "+" || fmt[i + 1] === "-")) {
      const forceSign = fmt[i + 1] === "+";
      i += 2;
      let digits = "";
      while (i < fmt.length && fmt[i] === "0") digits += fmt[i++];
      tokens.push({ type: "scientific", forceSign, digits, pos });
      continue;
    }
    if (fmt.slice(i, i + 5).toLowerCase() === "am/pm") {
      tokens.push({ type: "date-token", token: "am/pm", pos });
      i += 5;
      continue;
    }
    if (fmt.slice(i, i + 3).toLowerCase() === "a/p") {
      tokens.push({ type: "date-token", token: "a/p", pos });
      i += 3;
      continue;
    }
    let matched = false;
    for (const dt of DATE_TOKENS) {
      if (fmt.slice(i, i + dt.length).toLowerCase() === dt) {
        tokens.push({ type: "date-token", token: dt, pos });
        i += dt.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (ch === "_" && i + 1 < fmt.length) {
      tokens.push({ type: "padding", char: fmt[i + 1], pos });
      i += 2;
      continue;
    }
    if (ch === "*" && i + 1 < fmt.length) {
      tokens.push({ type: "fill", char: fmt[i + 1], pos });
      i += 2;
      continue;
    }
    if (ch === "0" || ch === "#" || ch === "?") {
      tokens.push({ type: "digit", char: ch, pos });
    } else if (ch === ".") {
      tokens.push({ type: "decimal", pos });
    } else if (ch === ",") {
      tokens.push({ type: "group", pos });
    } else if (ch === ";") {
      tokens.push({ type: "section-sep", pos });
    } else if (ch === "%") {
      tokens.push({ type: "percent", pos });
    } else if (ch === "@") {
      tokens.push({ type: "text-placeholder", pos });
    } else {
      tokens.push({ type: "literal", value: ch, pos });
    }
    i++;
  }
  return tokens;
}

// src/parser/parse.ts
function parse(fmt) {
  if (fmt == null || fmt === "" || fmt.toLowerCase() === "general") {
    return { kind: "general" };
  }
  const tokens = tokenize(fmt);
  const sectionTokens = splitSections(tokens);
  if (sectionTokens.length > 4) {
    throw new ParseError("Too many sections (max 4)", fmt, 0);
  }
  const sections = sectionTokens.map((st) => buildSection(st));
  return { kind: "sections", sections };
}
function splitSections(tokens) {
  const sections = [];
  let current = [];
  for (const tok of tokens) {
    if (tok.type === "section-sep") {
      sections.push(current);
      current = [];
    } else {
      current.push(tok);
    }
  }
  sections.push(current);
  return sections;
}
function buildSection(tokens) {
  let condition;
  let color;
  const parts = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === "condition") {
      condition = { operator: tok.operator, value: tok.value };
      continue;
    }
    if (tok.type === "color") {
      color = tok.value;
      continue;
    }
    if (tok.type === "digit") {
      parts.push({ kind: "digit", char: tok.char });
      continue;
    }
    if (tok.type === "decimal") {
      parts.push({ kind: "decimal" });
      continue;
    }
    if (tok.type === "group") {
      parts.push({ kind: "group" });
      continue;
    }
    if (tok.type === "percent") {
      parts.push({ kind: "percent" });
      continue;
    }
    if (tok.type === "text-placeholder") {
      parts.push({ kind: "text-placeholder" });
      continue;
    }
    if (tok.type === "literal") {
      parts.push({ kind: "literal", value: tok.value });
      continue;
    }
    if (tok.type === "padding") {
      parts.push({ kind: "padding", char: tok.char });
      continue;
    }
    if (tok.type === "fill") {
      parts.push({ kind: "fill", char: tok.char });
      continue;
    }
    if (tok.type === "currency") {
      parts.push({ kind: "literal", value: tok.symbol });
      continue;
    }
    if (tok.type === "elapsed") {
      parts.push({ kind: "elapsed", unit: tok.unit });
      continue;
    }
    if (tok.type === "scientific") {
      parts.push({ kind: "scientific", forceSign: tok.forceSign, digits: tok.digits });
      continue;
    }
    if (tok.type === "date-token") {
      const lc = tok.token.toLowerCase();
      if (lc === "am/pm") {
        parts.push({ kind: "date", token: "ampm" });
        continue;
      }
      if (lc === "a/p") {
        parts.push({ kind: "date", token: "ap" });
        continue;
      }
      parts.push({ kind: "date", token: lc });
      continue;
    }
  }
  return { condition, color, parts };
}

// src/formatter/numeric.ts
function formatNumeric(section, absValue, locale) {
  const parts = section.parts;
  if (typeof absValue === "bigint") {
    const intStr2 = absValue.toString();
    const decimalIdx2 = parts.findIndex((p) => p.kind === "decimal");
    const intParts2 = decimalIdx2 === -1 ? parts : parts.slice(0, decimalIdx2);
    const scalingCommas2 = countScalingCommas(parts);
    const hasGrouping2 = parts.filter((p) => p.kind === "group").length - scalingCommas2 > 0;
    const intFormatted2 = formatInteger(intStr2, intParts2, hasGrouping2, locale);
    return wrapWithLiterals(parts, intFormatted2);
  }
  if (parts.some((p) => p.kind === "scientific")) {
    return formatScientific(absValue, parts, locale);
  }
  if (parts.some((p) => p.kind === "literal" && p.value === "/")) {
    return formatFractionDisplay(absValue, parts, locale);
  }
  const scalingCommas = countScalingCommas(parts);
  let value = absValue / Math.pow(1e3, scalingCommas);
  const hasPercent = parts.some((p) => p.kind === "percent");
  if (hasPercent) value *= 100;
  const decimalIdx = parts.findIndex((p) => p.kind === "decimal");
  const intParts = decimalIdx === -1 ? parts : parts.slice(0, decimalIdx);
  const fracDigits = decimalIdx === -1 ? [] : parts.slice(decimalIdx + 1).filter((p) => p.kind === "digit");
  const decimalPlaces = fracDigits.length;
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  const intStr = Math.floor(Math.abs(rounded)).toString();
  const totalGroups = parts.filter((p) => p.kind === "group").length;
  const hasGrouping = totalGroups - scalingCommas > 0;
  const intFormatted = formatInteger(intStr, intParts, hasGrouping, locale);
  let fracFormatted = "";
  if (decimalIdx !== -1) {
    const fracRaw = decimalPlaces > 0 ? (Math.abs(rounded) % 1).toFixed(decimalPlaces).slice(2) : "";
    fracFormatted = locale.decimalSeparator + formatDecimalFraction(fracRaw, fracDigits);
  }
  let numeric = intFormatted + fracFormatted;
  if (hasPercent) numeric += "%";
  return wrapWithLiterals(parts, numeric);
}
function formatScientific(absValue, parts, locale) {
  const sciIdx = parts.findIndex((p) => p.kind === "scientific");
  const sciPart = parts[sciIdx];
  const decimalIdx = parts.findIndex((p) => p.kind === "decimal");
  const intDigits = (decimalIdx === -1 ? parts.slice(0, sciIdx) : parts.slice(0, decimalIdx)).filter((p) => p.kind === "digit");
  const fracDigits = decimalIdx === -1 ? [] : parts.slice(decimalIdx + 1, sciIdx).filter((p) => p.kind === "digit");
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
  const zeroCount = intDigits.filter((d) => d.char === "0").length;
  const mantissaInt = intStr.padStart(zeroCount, "0");
  let mantissaFrac = "";
  if (decimalPlaces > 0) {
    mantissaFrac = locale.decimalSeparator + (roundedMantissa % 1).toFixed(decimalPlaces).slice(2);
  }
  const expSign = exp < 0 ? "-" : sciPart.forceSign ? "+" : "";
  const expStr = Math.abs(exp).toString().padStart(sciPart.digits.length, "0");
  return mantissaInt + mantissaFrac + "E" + expSign + expStr;
}
function formatFractionDisplay(absValue, parts, locale) {
  const slashIdx = parts.findIndex((p) => p.kind === "literal" && p.value === "/");
  const numeratorDigits = [];
  let i = slashIdx - 1;
  while (i >= 0 && parts[i].kind === "digit") {
    numeratorDigits.unshift(parts[i]);
    i--;
  }
  while (i >= 0 && parts[i].kind !== "digit") i--;
  const wholeDigits = [];
  while (i >= 0 && parts[i].kind === "digit") {
    wholeDigits.unshift(parts[i]);
    i--;
  }
  let denomFixed = null;
  const denomDigits = [];
  let j = slashIdx + 1;
  if (j < parts.length && parts[j].kind === "literal") {
    const n = parseInt(parts[j].value, 10);
    if (!isNaN(n)) denomFixed = n;
  } else {
    while (j < parts.length && parts[j].kind === "digit") {
      denomDigits.push(parts[j]);
      j++;
    }
  }
  const hasWhole = wholeDigits.length > 0;
  const wholeVal = hasWhole ? Math.floor(absValue) : 0;
  const fracVal = hasWhole ? absValue - wholeVal : absValue;
  let num, den;
  if (denomFixed !== null) {
    den = denomFixed;
    num = Math.round(fracVal * den);
  } else {
    const maxDen = Math.pow(10, denomDigits.length) - 1;
    [num, den] = bestFraction(fracVal, maxDen);
  }
  let result = "";
  if (hasWhole) {
    const wholeStr = wholeVal.toString();
    const wholeZeros = wholeDigits.filter((d) => d.char === "0").length;
    const wholeHashCount = wholeDigits.filter((d) => d.char === "#").length;
    const wholePadded = wholeStr.padStart(wholeZeros, "0");
    if (parseInt(wholePadded, 10) === 0 && wholeZeros === 0 && wholeHashCount > 0) {
      result = "";
    } else {
      result = wholePadded;
    }
    let k = wholeDigits.length > 0 ? i + 1 : 0;
    const sepStart = parts.indexOf(wholeDigits[wholeDigits.length - 1]) + 1;
    const sepEnd = parts.indexOf(numeratorDigits[0]);
    for (let s = sepStart; s < sepEnd; s++) {
      if (parts[s].kind === "literal") result += parts[s].value;
    }
  }
  const numStr = num.toString();
  const numZeros = numeratorDigits.filter((d) => d.char === "0").length;
  result += numStr.padStart(numZeros, "0");
  result += "/";
  if (denomFixed !== null) {
    result += den.toString();
  } else {
    const denStr = den.toString();
    const denZeros = denomDigits.filter((d) => d.char === "0").length;
    result += denStr.padStart(denZeros, "0");
  }
  return result;
}
function bestFraction(frac, maxDen) {
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
function countScalingCommas(parts) {
  let count = 0;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.kind === "group") {
      count++;
      continue;
    }
    if (p.kind === "digit" || p.kind === "decimal") break;
  }
  return count;
}
function formatInteger(intStr, intParts, hasGrouping, locale) {
  const digitParts = intParts.filter((p) => p.kind === "digit");
  if (digitParts.length === 0) return "";
  const zeroCount = digitParts.filter((p) => p.char === "0").length;
  const hashCount = digitParts.filter((p) => p.char === "#").length;
  const spaceCount = digitParts.filter((p) => p.char === "?").length;
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
function addGroupSeparator(intStr, sep) {
  let result = "";
  const len = intStr.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) result += sep;
    result += intStr[i];
  }
  return result;
}
function formatDecimalFraction(fracStr, parts) {
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
function wrapWithLiterals(parts, numeric) {
  let before = "";
  let after = "";
  let inNumericZone = false;
  for (const p of parts) {
    const isNumeric = p.kind === "digit" || p.kind === "decimal" || p.kind === "group" || p.kind === "percent" || p.kind === "scientific";
    if (isNumeric) {
      inNumericZone = true;
    } else if (p.kind === "literal") {
      if (!inNumericZone) before += p.value;
      else after += p.value;
    }
  }
  return before + numeric + after;
}

// src/formatter/datetime.ts
function formatDateTime(section, date, locale) {
  const parts = section.parts;
  const hasAmPm = parts.some((p) => p.kind === "date" && (p.token === "ampm" || p.token === "ap"));
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.kind === "literal") {
      result += p.value;
      continue;
    }
    if (p.kind === "padding" || p.kind === "fill") continue;
    if (p.kind === "group") {
      result += ",";
      continue;
    }
    if (p.kind === "elapsed") {
      result += formatElapsed(p.unit, date);
      continue;
    }
    if (p.kind === "decimal") {
      let j = i + 1;
      let digits = 0;
      while (j < parts.length && parts[j].kind === "digit") {
        digits++;
        j++;
      }
      if (digits > 0) {
        result += "." + String(date.getMilliseconds()).padStart(3, "0").slice(0, digits);
        i = j - 1;
      }
      continue;
    }
    if (p.kind !== "date") continue;
    const isMinute = p.token === "m" || p.token === "mm" ? isAdjacentToHourOrSecond(parts, i) : false;
    result += formatDateToken(p.token, date, locale, hasAmPm, isMinute);
  }
  return result;
}
function isAdjacentToHourOrSecond(parts, idx) {
  for (let j = idx - 1; j >= 0; j--) {
    const p = parts[j];
    if (p.kind === "literal") continue;
    if (p.kind === "date" && (p.token === "h" || p.token === "hh")) return true;
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
function formatDateToken(token, date, locale, hasAmPm, isMinute) {
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
    case "yyyy":
      return String(y);
    case "yy":
      return String(y).slice(-2);
    case "mmmm":
      return isMinute ? pad2(min) : locale.monthNames[mo];
    case "mmm":
      return isMinute ? pad2(min) : locale.shortMonthNames[mo];
    case "mm":
      return isMinute ? pad2(min) : pad2(mo + 1);
    case "m":
      return isMinute ? String(min) : String(mo + 1);
    case "dddd":
      return locale.dayNames[dow];
    case "ddd":
      return locale.shortDayNames[dow];
    case "dd":
      return pad2(d);
    case "d":
      return String(d);
    case "hh":
      return pad2(hour);
    case "h":
      return String(hour);
    case "ss":
      return pad2(sec);
    case "s":
      return String(sec);
    case "ampm":
      return h24 < 12 ? locale.amLabel : locale.pmLabel;
    case "ap":
      return h24 < 12 ? locale.amLabel[0] : locale.pmLabel[0];
    case "fracSeconds":
      return String(ms).padStart(3, "0");
    default:
      return "";
  }
}
function formatElapsed(unit, date) {
  const totalMs = date.getTime();
  const negative = totalMs < 0;
  const abs = Math.abs(totalMs);
  let val;
  if (unit === "h") val = Math.floor(abs / 36e5);
  else if (unit === "m") val = Math.floor(abs / 6e4);
  else val = Math.floor(abs / 1e3);
  return (negative ? "-" : "") + String(val);
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

// src/formatter/text.ts
function formatText(section, value) {
  let result = "";
  for (const part of section.parts) {
    if (part.kind === "text-placeholder") {
      result += value;
    } else if (part.kind === "literal") {
      result += part.value;
    }
  }
  return result;
}

// src/formatter/format.ts
function formatValue(value, formatString, locale) {
  const ast = parse(formatString);
  if (ast.kind === "general") {
    return formatGeneral(value, locale);
  }
  const section = selectSection(ast, value);
  const formatted = renderSection(section, value, locale);
  const isNegative = typeof value === "number" && value < 0 || typeof value === "bigint" && value < 0n;
  if (ast.sections.length === 1 && isNegative) {
    return "-" + formatted;
  }
  return formatted;
}
function formatGeneral(value, locale) {
  if (value instanceof Date) {
    const d = value.getDate();
    const mon = locale.shortMonthNames[value.getMonth()];
    const y = value.getFullYear();
    return `${d}-${mon}-${y}`;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") return String(value);
  return String(value);
}
function selectSection(ast, value) {
  const sections = ast.sections;
  const conditionals = sections.filter((s) => s.condition != null);
  if (conditionals.length > 0) {
    const num2 = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : NaN;
    for (const s of conditionals) {
      if (evalCondition(s.condition, num2)) return s;
    }
    const unconditional = sections.filter((s) => s.condition == null);
    return unconditional[unconditional.length - 1] ?? sections[sections.length - 1];
  }
  const n = sections.length;
  if (n === 1) return sections[0];
  if (typeof value === "string") return n >= 4 ? sections[3] : sections[0];
  if (value instanceof Date) return sections[0];
  const num = typeof value === "bigint" ? Number(value) : value;
  if (n === 2) return num < 0 ? sections[1] : sections[0];
  if (n === 3) {
    if (num > 0) return sections[0];
    if (num < 0) return sections[1];
    return sections[2];
  }
  if (num > 0) return sections[0];
  if (num < 0) return sections[1];
  return sections[2];
}
function evalCondition(cond, num) {
  switch (cond.operator) {
    case ">":
      return num > cond.value;
    case ">=":
      return num >= cond.value;
    case "<":
      return num < cond.value;
    case "<=":
      return num <= cond.value;
    case "=":
      return num === cond.value;
    case "<>":
      return num !== cond.value;
    default:
      return false;
  }
}
function renderSection(section, value, locale) {
  const hasDate = section.parts.some((p) => p.kind === "date" || p.kind === "elapsed");
  const hasText = section.parts.some((p) => p.kind === "text-placeholder");
  if (value instanceof Date || hasDate) {
    const date = value instanceof Date ? value : new Date(Number(value) * 864e5);
    return formatDateTime(section, date, locale);
  }
  if (typeof value === "string" || hasText) {
    return formatText(section, String(value));
  }
  if (typeof value === "bigint") {
    return formatNumeric(section, value < 0n ? -value : value, locale);
  }
  const num = value;
  return formatNumeric(section, Math.abs(num), locale);
}

// src/SheetNumberFormatter.ts
var SheetNumberFormatter = class {
  format(value, formatString, locale) {
    return formatValue(value, formatString, locale);
  }
  compile(formatString) {
    parse(formatString);
    return {
      format: (value, locale) => formatValue(value, formatString, locale)
    };
  }
};

// src/locale/enUS.ts
var enUS = {
  decimalSeparator: ".",
  groupSeparator: ",",
  dateSeparator: "/",
  monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  singleLetterMonthNames: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  shortDayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  amLabel: "AM",
  pmLabel: "PM"
};

// src/locale/localeFromIntl.ts
function localeFromIntl(tag) {
  const numFmt = new Intl.NumberFormat(tag);
  const parts = numFmt.formatToParts(123456789e-2);
  const decimalSeparator = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const groupSeparator = parts.find((p) => p.type === "group")?.value ?? ",";
  const dateFmt = new Intl.DateTimeFormat(tag, { year: "numeric", month: "2-digit", day: "2-digit" });
  const dateParts = dateFmt.formatToParts(new Date(2e3, 0, 1));
  const dateSeparator = dateParts.find((p) => p.type === "literal")?.value?.trim() ?? "/";
  const monthNames = [];
  const shortMonthNames = [];
  const singleLetterMonthNames = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2e3, m, 1);
    monthNames.push(new Intl.DateTimeFormat(tag, { month: "long" }).format(d));
    shortMonthNames.push(new Intl.DateTimeFormat(tag, { month: "short" }).format(d));
    singleLetterMonthNames.push(new Intl.DateTimeFormat(tag, { month: "narrow" }).format(d));
  }
  const dayNames = [];
  const shortDayNames = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(2e3, 0, 2 + d);
    dayNames.push(new Intl.DateTimeFormat(tag, { weekday: "long" }).format(date));
    shortDayNames.push(new Intl.DateTimeFormat(tag, { weekday: "short" }).format(date));
  }
  const timeFmt = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true });
  const amParts = timeFmt.formatToParts(new Date(2e3, 0, 1, 6));
  const pmParts = timeFmt.formatToParts(new Date(2e3, 0, 1, 18));
  const amLabel = amParts.find((p) => p.type === "dayPeriod")?.value ?? "AM";
  const pmLabel = pmParts.find((p) => p.type === "dayPeriod")?.value ?? "PM";
  return {
    decimalSeparator,
    groupSeparator,
    dateSeparator,
    monthNames,
    shortMonthNames,
    singleLetterMonthNames,
    dayNames,
    shortDayNames,
    amLabel,
    pmLabel
  };
}
export {
  ParseError,
  SheetNumberFormatter,
  enUS,
  localeFromIntl
};
