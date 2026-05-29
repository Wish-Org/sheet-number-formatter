import { ParseError } from "../errors.js";

export type Token =
  | { type: "digit"; char: "0" | "#" | "?"; pos: number }
  | { type: "decimal"; pos: number }
  | { type: "group"; pos: number }
  | { type: "percent"; pos: number }
  | { type: "section-sep"; pos: number }
  | { type: "text-placeholder"; pos: number }
  | { type: "literal"; value: string; pos: number }
  | { type: "padding"; char: string; pos: number }
  | { type: "fill"; char: string; pos: number }
  | { type: "date-token"; token: string; pos: number }
  | { type: "elapsed"; unit: "h" | "m" | "s"; digits: number; pos: number }
  | { type: "condition"; operator: ">" | ">=" | "<" | "<=" | "=" | "<>"; value: number; pos: number }
  | { type: "color"; value: string; pos: number }
  | { type: "currency"; symbol: string; pos: number }
  | { type: "scientific"; forceSign: boolean; digits: string; pos: number };

const DATE_TOKENS = ["yyyy","yy","y","mmmm","mmm","mm","m","dddd","ddd","dd","d","hh","h","ss","s"];

export function tokenize(fmt: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < fmt.length) {
    const pos = i;
    const ch = fmt[i];

    // Quoted literal
    if (ch === '"') {
      i++;
      let value = "";
      while (i < fmt.length && fmt[i] !== '"') value += fmt[i++];
      if (i >= fmt.length) throw new ParseError("Unclosed quoted string", fmt, pos);
      i++;
      tokens.push({ type: "literal", value, pos });
      continue;
    }

    // Escaped character
    if (ch === "\\") {
      i++;
      if (i < fmt.length) tokens.push({ type: "literal", value: fmt[i++], pos });
      continue;
    }

    // Bracket tokens: [h], [mm], [s], [Red], [$...], [>=x], etc.
    if (ch === "[") {
      i++;
      const bracketPos = pos;
      let inner = "";
      while (i < fmt.length && fmt[i] !== "]") inner += fmt[i++];
      if (i >= fmt.length) throw new ParseError("Unclosed bracket", fmt, bracketPos);
      i++;

      const lc = inner.toLowerCase();

      if (/^h+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "h", digits: lc.length, pos: bracketPos }); continue; }
      if (/^m+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "m", digits: lc.length, pos: bracketPos }); continue; }
      if (/^s+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "s", digits: lc.length, pos: bracketPos }); continue; }

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
          operator: condMatch[1] as ">" | ">=" | "<" | "<=" | "=" | "<>",
          value: parseFloat(condMatch[2]),
          pos: bracketPos,
        });
        continue;
      }

      tokens.push({ type: "color", value: inner, pos: bracketPos });
      continue;
    }

    // Scientific: E+ or E- followed by 0s
    if ((ch === "E" || ch === "e") && i + 1 < fmt.length && (fmt[i + 1] === "+" || fmt[i + 1] === "-")) {
      const forceSign = fmt[i + 1] === "+";
      i += 2;
      let digits = "";
      while (i < fmt.length && fmt[i] === "0") digits += fmt[i++];
      tokens.push({ type: "scientific", forceSign, digits, pos });
      continue;
    }

    // AM/PM (case-insensitive) — store original slice to preserve case
    if (fmt.slice(i, i + 5).toLowerCase() === "am/pm") {
      tokens.push({ type: "date-token", token: fmt.slice(i, i + 5), pos });
      i += 5;
      continue;
    }
    if (fmt.slice(i, i + 3).toLowerCase() === "a/p") {
      tokens.push({ type: "date-token", token: fmt.slice(i, i + 3), pos });
      i += 3;
      continue;
    }

    // "General" keyword (case-insensitive)
    if (fmt.slice(i, i + 7).toLowerCase() === "general") {
      tokens.push({ type: "literal", value: "General", pos });
      i += 7;
      continue;
    }

    // Date tokens (longest match first)
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

    // Padding: _x
    if (ch === "_" && i + 1 < fmt.length) {
      tokens.push({ type: "padding", char: fmt[i + 1], pos });
      i += 2;
      continue;
    }

    // Fill: *x
    if (ch === "*" && i + 1 < fmt.length) {
      tokens.push({ type: "fill", char: fmt[i + 1], pos });
      i += 2;
      continue;
    }

    // Single-character tokens
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
    } else if (/[a-zA-Z]/.test(ch)) {
      throw new ParseError(`Unquoted letter '${ch}' is not a valid format token — wrap literal text in double quotes`, fmt, pos);
    } else {
      tokens.push({ type: "literal", value: ch, pos });
    }
    i++;
  }

  return tokens;
}
