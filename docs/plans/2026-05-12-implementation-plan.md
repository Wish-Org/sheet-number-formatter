# sheet-number-formatter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-only TypeScript ESM library that formats `number`, `bigint`, and `Date` values using Excel/Google Sheets-style format strings.

**Architecture:** Hand-written two-phase parser (lexer → AST) feeds a section-based formatter that delegates to numeric, date/time, or text renderers. The main `SheetNumberFormatter` class is stateless; callers pass the format string on each `format()` call or pre-parse via `compile()`.

**Tech Stack:** TypeScript strict, tsup (ESM + .d.ts), Vitest, no runtime dependencies.

---

## Progress

- [x] Task 1: Project scaffolding
- [x] Task 2: AST types
- [x] Task 3: ParseError
- [x] Task 4: SheetLocale interface and enUS built-in
- [x] Task 5: localeFromIntl helper
- [x] Task 6: Lexer
- [x] Task 7: Parser
- [x] Task 8: Text formatter
- [x] Task 9: Numeric formatter — basic
- [x] Task 10: Numeric formatter — scientific notation and fractions
- [x] Task 11: Date/time formatter
- [x] Task 12: Section selector and top-level format dispatcher
- [ ] Task 13: SheetNumberFormatter class and public exports
- [ ] Task 14: Port .NET ExcelNumberFormat test corpus
- [ ] Task 15: Run full test suite and build

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts` (empty placeholder)

**Step 1: Create package.json**

```json
{
  "name": "sheet-number-formatter",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2020",
});
```

**Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
  },
});
```

**Step 5: Create empty src/index.ts**

```ts
// exports added incrementally as modules are built
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors.

**Step 7: Verify build works on empty entry**

Run: `npm run build`
Expected: `dist/index.js` and `dist/index.d.ts` created.

**Step 8: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts src/index.ts
git commit -m "chore: scaffold project with tsup and vitest"
```

---

## Task 2: AST types

**Files:**
- Create: `src/parser/types.ts`

No tests needed — this is pure type definitions.

**Step 1: Create src/parser/types.ts**

```ts
export type FormatAST =
  | { kind: "general" }
  | { kind: "sections"; sections: FormatSection[] };

export type FormatSection = {
  condition?: Condition;
  color?: string;
  parts: FormatPart[];
};

export type Condition = {
  operator: ">" | ">=" | "<" | "<=" | "=" | "<>";
  value: number;
};

export type DateToken =
  | "yyyy" | "yy"
  | "mmmm" | "mmm" | "mm" | "m"
  | "dddd" | "ddd" | "dd" | "d"
  | "hh" | "h"
  | "ss" | "s"
  | "ampm" | "ap"
  | "fracSeconds";

export type FormatPart =
  | { kind: "digit"; char: "0" | "#" | "?" }
  | { kind: "decimal" }
  | { kind: "group" }
  | { kind: "percent" }
  | { kind: "scientific"; forceSign: boolean; digits: string }
  | { kind: "fraction"; numerator: string; denominator: string | number }
  | { kind: "date"; token: DateToken }
  | { kind: "elapsed"; unit: "h" | "m" | "s" }
  | { kind: "text-placeholder" }
  | { kind: "literal"; value: string }
  | { kind: "padding"; char: string }
  | { kind: "fill"; char: string };
```

**Step 2: Commit**

```bash
git add src/parser/types.ts
git commit -m "feat: add FormatAST type definitions"
```

---

## Task 3: ParseError

**Files:**
- Create: `src/errors.ts`
- Create: `tests/errors.test.ts`

**Step 1: Write the failing test**

```ts
// tests/errors.test.ts
import { describe, it, expect } from "vitest";
import { ParseError } from "../src/errors.js";

describe("ParseError", () => {
  it("is an instance of Error", () => {
    const err = new ParseError("bad token", "0.0@", 3);
    expect(err).toBeInstanceOf(Error);
  });

  it("exposes formatString and position", () => {
    const err = new ParseError("bad token", "0.0@", 3);
    expect(err.formatString).toBe("0.0@");
    expect(err.position).toBe(3);
  });

  it("includes position and format string in message", () => {
    const err = new ParseError("Unexpected character", "0.0@", 3);
    expect(err.message).toContain("0.0@");
    expect(err.message).toContain("3");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/errors.test.ts`
Expected: FAIL — `ParseError` not found.

**Step 3: Implement ParseError**

```ts
// src/errors.ts
export class ParseError extends Error {
  constructor(
    message: string,
    readonly formatString: string,
    readonly position: number,
  ) {
    super(`${message} at position ${position} in "${formatString}"`);
    this.name = "ParseError";
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/errors.test.ts`
Expected: PASS — 3 tests pass.

**Step 5: Commit**

```bash
git add src/errors.ts tests/errors.test.ts
git commit -m "feat: add ParseError class"
```

---

## Task 4: SheetLocale interface and enUS built-in

**Files:**
- Create: `src/locale/types.ts`
- Create: `src/locale/enUS.ts`
- Create: `tests/locale.test.ts`

**Step 1: Create src/locale/types.ts**

```ts
export interface SheetLocale {
  decimalSeparator: string;
  groupSeparator: string;
  dateSeparator: string;
  monthNames: string[];
  shortMonthNames: string[];
  singleLetterMonthNames: string[];
  dayNames: string[];
  shortDayNames: string[];
  amLabel: string;
  pmLabel: string;
}
```

**Step 2: Write the failing test for enUS**

```ts
// tests/locale.test.ts
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
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run tests/locale.test.ts`
Expected: FAIL — enUS not found.

**Step 4: Implement enUS**

```ts
// src/locale/enUS.ts
import type { SheetLocale } from "./types.js";

export const enUS: SheetLocale = {
  decimalSeparator: ".",
  groupSeparator: ",",
  dateSeparator: "/",
  monthNames: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  shortMonthNames: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  singleLetterMonthNames: ["J","F","M","A","M","J","J","A","S","O","N","D"],
  dayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  shortDayNames: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  amLabel: "AM",
  pmLabel: "PM",
};
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/locale.test.ts`
Expected: PASS — all tests pass.

**Step 6: Commit**

```bash
git add src/locale/types.ts src/locale/enUS.ts tests/locale.test.ts
git commit -m "feat: add SheetLocale interface and enUS built-in"
```

---

## Task 5: localeFromIntl helper

**Files:**
- Create: `src/locale/localeFromIntl.ts`
- Create: `tests/localeFromIntl.test.ts`

**Step 1: Write the failing tests**

```ts
// tests/localeFromIntl.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/localeFromIntl.test.ts`
Expected: FAIL — localeFromIntl not found.

**Step 3: Implement localeFromIntl**

```ts
// src/locale/localeFromIntl.ts
import type { SheetLocale } from "./types.js";

export function localeFromIntl(tag: string): SheetLocale {
  // Extract decimal and group separators
  const numFmt = new Intl.NumberFormat(tag);
  const parts = numFmt.formatToParts(1234567.89);
  const decimalSeparator = parts.find(p => p.type === "decimal")?.value ?? ".";
  const groupSeparator = parts.find(p => p.type === "group")?.value ?? ",";

  // Extract date separator by formatting a known date and finding the separator
  const dateFmt = new Intl.DateTimeFormat(tag, { year: "numeric", month: "2-digit", day: "2-digit" });
  const dateParts = dateFmt.formatToParts(new Date(2000, 0, 1));
  const dateSeparator = dateParts.find(p => p.type === "literal")?.value?.trim() ?? "/";

  // Extract month names
  const monthNames: string[] = [];
  const shortMonthNames: string[] = [];
  const singleLetterMonthNames: string[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(2000, m, 1);
    monthNames.push(new Intl.DateTimeFormat(tag, { month: "long" }).format(d));
    shortMonthNames.push(new Intl.DateTimeFormat(tag, { month: "short" }).format(d));
    singleLetterMonthNames.push(new Intl.DateTimeFormat(tag, { month: "narrow" }).format(d));
  }

  // Extract day names (0 = Sunday in JS Date)
  const dayNames: string[] = [];
  const shortDayNames: string[] = [];
  for (let d = 0; d < 7; d++) {
    // 2000-01-02 is a Sunday
    const date = new Date(2000, 0, 2 + d);
    dayNames.push(new Intl.DateTimeFormat(tag, { weekday: "long" }).format(date));
    shortDayNames.push(new Intl.DateTimeFormat(tag, { weekday: "short" }).format(date));
  }

  // Extract AM/PM labels by formatting noon and midnight
  const timeFmt = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true });
  const amParts = timeFmt.formatToParts(new Date(2000, 0, 1, 6));
  const pmParts = timeFmt.formatToParts(new Date(2000, 0, 1, 18));
  const amLabel = amParts.find(p => p.type === "dayPeriod")?.value ?? "AM";
  const pmLabel = pmParts.find(p => p.type === "dayPeriod")?.value ?? "PM";

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
    pmLabel,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/localeFromIntl.test.ts`
Expected: PASS — all tests pass.

**Step 5: Commit**

```bash
git add src/locale/localeFromIntl.ts tests/localeFromIntl.test.ts
git commit -m "feat: add localeFromIntl helper"
```

---

## Task 6: Lexer

**Files:**
- Create: `src/parser/lexer.ts`
- Create: `tests/lexer.test.ts`

The lexer converts a raw format string into a flat array of typed tokens. The parser (Task 7) will group these into sections and resolve ambiguities.

**Step 1: Write failing tests**

```ts
// tests/lexer.test.ts
import { describe, it, expect } from "vitest";
import { tokenize, Token } from "../src/parser/lexer.js";

describe("tokenize", () => {
  it("tokenizes digit placeholders", () => {
    expect(tokenize("0#?")).toEqual<Token[]>([
      { type: "digit", char: "0", pos: 0 },
      { type: "digit", char: "#", pos: 1 },
      { type: "digit", char: "?", pos: 2 },
    ]);
  });

  it("tokenizes decimal and group", () => {
    expect(tokenize(".,")).toEqual<Token[]>([
      { type: "decimal", pos: 0 },
      { type: "group", pos: 1 },
    ]);
  });

  it("tokenizes section separator", () => {
    expect(tokenize(";")).toEqual<Token[]>([
      { type: "section-sep", pos: 0 },
    ]);
  });

  it("tokenizes quoted literal", () => {
    expect(tokenize('"hello"')).toEqual<Token[]>([
      { type: "literal", value: "hello", pos: 0 },
    ]);
  });

  it("tokenizes escaped character", () => {
    expect(tokenize("\\$")).toEqual<Token[]>([
      { type: "literal", value: "$", pos: 0 },
    ]);
  });

  it("tokenizes percent", () => {
    expect(tokenize("%")).toEqual<Token[]>([
      { type: "percent", pos: 0 },
    ]);
  });

  it("tokenizes text placeholder", () => {
    expect(tokenize("@")).toEqual<Token[]>([
      { type: "text-placeholder", pos: 0 },
    ]);
  });

  it("tokenizes padding token", () => {
    expect(tokenize("_ ")).toEqual<Token[]>([
      { type: "padding", char: " ", pos: 0 },
    ]);
  });

  it("tokenizes fill token", () => {
    expect(tokenize("*-")).toEqual<Token[]>([
      { type: "fill", char: "-", pos: 0 },
    ]);
  });

  it("tokenizes date tokens in descending length order", () => {
    const tokens = tokenize("yyyy");
    expect(tokens).toEqual<Token[]>([
      { type: "date-token", token: "yyyy", pos: 0 },
    ]);
  });

  it("tokenizes mm as ambiguous month/minute", () => {
    const tokens = tokenize("mm");
    expect(tokens[0]).toMatchObject({ type: "date-token", token: "mm" });
  });

  it("tokenizes elapsed time [h]", () => {
    expect(tokenize("[h]")).toEqual<Token[]>([
      { type: "elapsed", unit: "h", pos: 0 },
    ]);
  });

  it("tokenizes elapsed time [mm]", () => {
    expect(tokenize("[mm]")).toEqual<Token[]>([
      { type: "elapsed", unit: "m", pos: 0 },
    ]);
  });

  it("tokenizes condition [>100]", () => {
    expect(tokenize("[>100]")).toEqual<Token[]>([
      { type: "condition", operator: ">", value: 100, pos: 0 },
    ]);
  });

  it("tokenizes condition [<>0]", () => {
    expect(tokenize("[<>0]")).toEqual<Token[]>([
      { type: "condition", operator: "<>", value: 0, pos: 0 },
    ]);
  });

  it("tokenizes color [Red]", () => {
    expect(tokenize("[Red]")).toEqual<Token[]>([
      { type: "color", value: "Red", pos: 0 },
    ]);
  });

  it("tokenizes currency [$USD]", () => {
    expect(tokenize("[$USD]")).toEqual<Token[]>([
      { type: "currency", symbol: "USD", pos: 0 },
    ]);
  });

  it("tokenizes currency [$€-1809] stripping locale code", () => {
    expect(tokenize("[$€-1809]")).toEqual<Token[]>([
      { type: "currency", symbol: "€", pos: 0 },
    ]);
  });

  it("tokenizes scientific notation E+00", () => {
    expect(tokenize("E+00")).toEqual<Token[]>([
      { type: "scientific", forceSign: true, digits: "00", pos: 0 },
    ]);
  });

  it("tokenizes scientific notation E-0", () => {
    expect(tokenize("E-0")).toEqual<Token[]>([
      { type: "scientific", forceSign: false, digits: "0", pos: 0 },
    ]);
  });

  it("throws ParseError on unclosed quoted string", () => {
    expect(() => tokenize('"abc')).toThrow("Unclosed quoted string");
  });

  it("tokenizes standalone literals ($, +, -, :, /)", () => {
    const tokens = tokenize("$+-()/:");
    expect(tokens.every(t => t.type === "literal")).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lexer.test.ts`
Expected: FAIL — tokenize not found.

**Step 3: Implement the lexer**

```ts
// src/parser/lexer.ts
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
  | { type: "elapsed"; unit: "h" | "m" | "s"; pos: number }
  | { type: "condition"; operator: ">" | ">=" | "<" | "<=" | "=" | "<>"; value: number; pos: number }
  | { type: "color"; value: string; pos: number }
  | { type: "currency"; symbol: string; pos: number }
  | { type: "scientific"; forceSign: boolean; digits: string; pos: number };

const DATE_TOKENS = ["yyyy","yy","mmmm","mmm","mm","m","dddd","ddd","dd","d","hh","h","ss","s","am/pm","a/p"];

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
      i++; // closing "
      tokens.push({ type: "literal", value, pos });
      continue;
    }

    // Escaped character
    if (ch === "\\") {
      i++;
      if (i < fmt.length) {
        tokens.push({ type: "literal", value: fmt[i++], pos });
      }
      continue;
    }

    // Bracket tokens: [h], [mm], [s], [Red], [$...], [>=x], etc.
    if (ch === "[") {
      i++;
      const bracketPos = pos;
      let inner = "";
      while (i < fmt.length && fmt[i] !== "]") inner += fmt[i++];
      if (i >= fmt.length) throw new ParseError("Unclosed bracket", fmt, bracketPos);
      i++; // ]

      const lc = inner.toLowerCase();

      // Elapsed: [h], [hh], [m], [mm], [s], [ss]
      if (/^h+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "h", pos: bracketPos }); continue; }
      if (/^m+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "m", pos: bracketPos }); continue; }
      if (/^s+$/.test(lc)) { tokens.push({ type: "elapsed", unit: "s", pos: bracketPos }); continue; }

      // Currency: [$symbol] or [$symbol-localeCode]
      if (inner.startsWith("$")) {
        const dashIdx = inner.indexOf("-", 1);
        const symbol = dashIdx === -1 ? inner.slice(1) : inner.slice(1, dashIdx);
        tokens.push({ type: "currency", symbol, pos: bracketPos });
        continue;
      }

      // Condition: [>x], [>=x], [<x], [<=x], [=x], [<>x]
      const condMatch = inner.match(/^(>=|<=|<>|>|<|=)(-?\d+(?:\.\d+)?)$/);
      if (condMatch) {
        tokens.push({
          type: "condition",
          operator: condMatch[1] as Token & { type: "condition" } extends { operator: infer O } ? O : never,
          value: parseFloat(condMatch[2]),
          pos: bracketPos,
        });
        continue;
      }

      // Color: [Red], [Blue], [Color3], etc.
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

    // AM/PM (case-insensitive)
    const ampm = fmt.slice(i, i + 5).toLowerCase();
    if (ampm === "am/pm") {
      tokens.push({ type: "date-token", token: fmt.slice(i, i + 5), pos });
      i += 5;
      continue;
    }
    const ap = fmt.slice(i, i + 3).toLowerCase();
    if (ap === "a/p") {
      tokens.push({ type: "date-token", token: fmt.slice(i, i + 3), pos });
      i += 3;
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
    } else if ("$+-():/ ".includes(ch)) {
      tokens.push({ type: "literal", value: ch, pos });
    } else {
      // Unknown character — treat as literal
      tokens.push({ type: "literal", value: ch, pos });
    }
    i++;
  }

  return tokens;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lexer.test.ts`
Expected: PASS — all tests pass.

**Step 5: Commit**

```bash
git add src/parser/lexer.ts tests/lexer.test.ts
git commit -m "feat: implement lexer"
```

---

## Task 7: Parser

**Files:**
- Create: `src/parser/parse.ts`
- Create: `tests/parser.test.ts`

The parser takes the flat token array from the lexer, splits on section separators, resolves `m`/`mm` month/minute ambiguity, and produces a `FormatAST`.

**Step 1: Write failing tests**

```ts
// tests/parser.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../src/parser/parse.js";
import { ParseError } from "../src/errors.js";

describe("parse", () => {
  it("returns general AST for null", () => {
    expect(parse(null)).toEqual({ kind: "general" });
  });

  it("returns general AST for empty string", () => {
    expect(parse("")).toEqual({ kind: "general" });
  });

  it("returns general AST for 'General'", () => {
    expect(parse("General")).toEqual({ kind: "general" });
  });

  it("parses single section with digit placeholder", () => {
    const ast = parse("0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(1);
    expect(ast.sections[0].parts).toContainEqual({ kind: "digit", char: "0" });
  });

  it("parses two sections", () => {
    const ast = parse("0;-0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(2);
  });

  it("parses four sections", () => {
    const ast = parse("0;-0;0;@");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(4);
  });

  it("throws ParseError for more than 4 sections", () => {
    expect(() => parse("0;0;0;0;0")).toThrow(ParseError);
  });

  it("parses condition in section", () => {
    const ast = parse("[>1000]0;0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].condition).toEqual({ operator: ">", value: 1000 });
  });

  it("parses color in section", () => {
    const ast = parse("[Red]0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].color).toBe("Red");
  });

  it("resolves mm as month when not adjacent to h/s", () => {
    const ast = parse("mm/dd/yyyy");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    const firstPart = ast.sections[0].parts[0];
    expect(firstPart).toEqual({ kind: "date", token: "mm" });
  });

  it("resolves mm as minute when after hh", () => {
    const ast = parse("hh:mm:ss");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    const mmPart = ast.sections[0].parts.find(
      p => p.kind === "date" && (p as { kind: "date"; token: string }).token === "mm"
    );
    expect(mmPart).toEqual({ kind: "date", token: "mm" }); // still mm but as minute — validated by formatter context
  });

  it("parses elapsed time", () => {
    const ast = parse("[h]:mm:ss");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "elapsed", unit: "h" });
  });

  it("parses literal text", () => {
    const ast = parse('"hello"');
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "literal", value: "hello" });
  });

  it("parses text placeholder @", () => {
    const ast = parse("@");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "text-placeholder" });
  });

  it("parses scientific notation", () => {
    const ast = parse("0.00E+00");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts).toContainEqual({ kind: "scientific", forceSign: true, digits: "00" });
  });

  it("parses percent", () => {
    const ast = parse("0%");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts).toContainEqual({ kind: "percent" });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — parse not found.

**Step 3: Implement the parser**

```ts
// src/parser/parse.ts
import { tokenize, type Token } from "./lexer.js";
import type { FormatAST, FormatSection, FormatPart, DateToken } from "./types.js";
import { ParseError } from "../errors.js";

export function parse(fmt: string | null | undefined): FormatAST {
  if (fmt == null || fmt === "" || fmt.toLowerCase() === "general") {
    return { kind: "general" };
  }

  const tokens = tokenize(fmt);
  const sectionTokens = splitSections(tokens, fmt);

  if (sectionTokens.length > 4) {
    throw new ParseError("Too many sections (max 4)", fmt, 0);
  }

  const sections: FormatSection[] = sectionTokens.map(st => buildSection(st, fmt));
  return { kind: "sections", sections };
}

function splitSections(tokens: Token[], fmt: string): Token[][] {
  const sections: Token[][] = [];
  let current: Token[] = [];
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

function buildSection(tokens: Token[], fmt: string): FormatSection {
  let condition: FormatSection["condition"];
  let color: string | undefined;
  const parts: FormatPart[] = [];

  // Resolve which date-tokens are minutes vs months
  const isMinuteIdx = resolveMinutes(tokens);

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
      const dt = tok.token.toLowerCase() as DateToken;
      // am/pm and a/p
      if (dt === "am/pm" || dt === "a/p") {
        parts.push({ kind: "date", token: dt === "am/pm" ? "ampm" : "ap" });
        continue;
      }
      // Fractional seconds: .0, .00, .000 handled as decimal + date-token combination
      parts.push({ kind: "date", token: dt as DateToken });
      continue;
    }
  }

  return { condition, color, parts };
}

// Determine which 'm'/'mm' tokens in the section are minutes (vs months).
// A date-token 'm' or 'mm' is a minute if it is immediately preceded or followed
// by an 'h'/'hh' or 's'/'ss' token (ignoring literals and non-date tokens).
function resolveMinutes(tokens: Token[]): Set<number> {
  // Not used to mutate tokens here — minute resolution is done in formatter
  // by inspecting adjacent tokens at format time. This function is a placeholder
  // if pre-resolution is needed in future.
  return new Set();
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/parser.test.ts`
Expected: PASS — all tests pass.

**Step 5: Commit**

```bash
git add src/parser/parse.ts tests/parser.test.ts
git commit -m "feat: implement format string parser"
```

---

## Task 8: Text formatter

**Files:**
- Create: `src/formatter/text.ts`
- Create: `tests/formatter/text.test.ts`

**Step 1: Write failing tests**

```ts
// tests/formatter/text.test.ts
import { describe, it, expect } from "vitest";
import { formatText } from "../../src/formatter/text.js";
import type { FormatSection } from "../../src/parser/types.js";

describe("formatText", () => {
  it("replaces @ with the string value", () => {
    const section: FormatSection = { parts: [{ kind: "text-placeholder" }] };
    expect(formatText(section, "hello")).toBe("hello");
  });

  it("includes literals around @", () => {
    const section: FormatSection = {
      parts: [
        { kind: "literal", value: "[" },
        { kind: "text-placeholder" },
        { kind: "literal", value: "]" },
      ],
    };
    expect(formatText(section, "world")).toBe("[world]");
  });

  it("renders section with no @ as literals only", () => {
    const section: FormatSection = { parts: [{ kind: "literal", value: "N/A" }] };
    expect(formatText(section, "anything")).toBe("N/A");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/formatter/text.test.ts`
Expected: FAIL.

**Step 3: Implement formatText**

```ts
// src/formatter/text.ts
import type { FormatSection } from "../parser/types.js";

export function formatText(section: FormatSection, value: string): string {
  let result = "";
  for (const part of section.parts) {
    if (part.kind === "text-placeholder") {
      result += value;
    } else if (part.kind === "literal") {
      result += part.value;
    }
    // padding and fill are no-ops
  }
  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/formatter/text.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/formatter/text.ts tests/formatter/text.test.ts
git commit -m "feat: implement text formatter"
```

---

## Task 9: Numeric formatter — basic (digit placeholders, decimal, grouping, scaling)

**Files:**
- Create: `src/formatter/numeric.ts`
- Create: `tests/formatter/numeric.test.ts`

**Step 1: Write failing tests**

```ts
// tests/formatter/numeric.test.ts
import { describe, it, expect } from "vitest";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { parse } from "../../src/parser/parse.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error("expected sections");
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("formatNumeric — digit placeholders", () => {
  it("0 pads integer to at least 1 digit", () => {
    expect(fmt("0", 0)).toBe("0");
    expect(fmt("0", 5)).toBe("5");
  });

  it("00 pads to 2 digits", () => {
    expect(fmt("00", 5)).toBe("05");
    expect(fmt("00", 15)).toBe("15");
  });

  it("# shows nothing for zero leading digit", () => {
    expect(fmt("#", 0)).toBe("");
    expect(fmt("#", 5)).toBe("5");
  });

  it("? pads with space for missing digit", () => {
    expect(fmt("?", 0)).toBe(" ");
    expect(fmt("?", 5)).toBe("5");
  });
});

describe("formatNumeric — decimal", () => {
  it("0.00 formats to 2 decimal places", () => {
    expect(fmt("0.00", 1.5)).toBe("1.50");
    expect(fmt("0.00", 1.005)).toBe("1.01");
  });

  it("0.## omits trailing zeros", () => {
    expect(fmt("0.##", 1.5)).toBe("1.5");
    expect(fmt("0.##", 1)).toBe("1.");
  });
});

describe("formatNumeric — grouping", () => {
  it("#,##0 adds thousands separator", () => {
    expect(fmt("#,##0", 1234567)).toBe("1,234,567");
    expect(fmt("#,##0", 999)).toBe("999");
  });

  it("###,##0.00 formats correctly", () => {
    expect(fmt("###,##0.00", 12345.6)).toBe("12,345.60");
  });
});

describe("formatNumeric — scaling", () => {
  it("0, scales by 1000", () => {
    expect(fmt("0,", 1000000)).toBe("1000");
  });

  it("0.0,, scales by 1000000", () => {
    expect(fmt("0.0,,", 1500000)).toBe("1.5");
  });
});

describe("formatNumeric — percent", () => {
  it("0% multiplies by 100 and appends %", () => {
    expect(fmt("0%", 0.5)).toBe("50%");
    expect(fmt("0.00%", 0.1234)).toBe("12.34%");
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run tests/formatter/numeric.test.ts`
Expected: FAIL.

**Step 3: Implement formatNumeric (basic)**

This is the most complex formatter. Implement iteratively:

```ts
// src/formatter/numeric.ts
import type { FormatSection, FormatPart } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

export function formatNumeric(section: FormatSection, absValue: number, locale: SheetLocale): string {
  const parts = section.parts;

  // Determine scaling from trailing commas (commas not adjacent to digits)
  const scalingCommas = countScalingCommas(parts);
  let value = absValue / Math.pow(1000, scalingCommas);

  // Percent
  const hasPercent = parts.some(p => p.kind === "percent");
  if (hasPercent) value *= 100;

  // Split into integer/decimal part specs
  const decimalIdx = parts.findIndex(p => p.kind === "decimal");
  const intParts = decimalIdx === -1 ? parts : parts.slice(0, decimalIdx);
  const fracParts = decimalIdx === -1 ? [] : parts.slice(decimalIdx + 1).filter(p => p.kind === "digit");

  // Count required and optional decimal places
  const decimalPlaces = fracParts.length;

  // Round value to required decimal places
  const factor = Math.pow(10, decimalPlaces);
  const rounded = Math.round(value * factor) / factor;

  const intStr = Math.floor(Math.abs(rounded)).toString();
  const fracStr = decimalPlaces > 0
    ? (Math.abs(rounded) % 1).toFixed(decimalPlaces).slice(2)
    : "";

  // Check if grouping is active (any non-trailing comma in intParts)
  const hasGrouping = intParts.some(p => p.kind === "group") && scalingCommas < intParts.filter(p => p.kind === "group").length;

  // Build integer string with grouping
  const intFormatted = formatInteger(intStr, intParts, hasGrouping, locale);

  // Build decimal string
  let fracFormatted = "";
  if (decimalPlaces > 0) {
    fracFormatted = locale.decimalSeparator + formatFraction(fracStr, fracParts as Extract<FormatPart, { kind: "digit" }>[]);
  }

  // Build result
  let result = intFormatted + fracFormatted;
  if (hasPercent) result += "%";

  // Prepend/append literals
  result = applyLiterals(parts, result, intFormatted + fracFormatted, hasPercent);

  return result;
}

function countScalingCommas(parts: FormatPart[]): number {
  // Trailing commas after the last digit placeholder are scaling commas
  let count = 0;
  let pastDigits = false;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (p.kind === "digit" || p.kind === "decimal") { pastDigits = true; break; }
    if (p.kind === "group") count++;
  }
  return pastDigits ? 0 : count; // simplification: only count if no digits follow
}

function formatInteger(intStr: string, parts: FormatPart[], hasGrouping: boolean, locale: SheetLocale): string {
  const digitParts = parts.filter(p => p.kind === "digit") as Extract<FormatPart, { kind: "digit" }>[];
  const minDigits = digitParts.filter(p => p.char === "0").length;

  let s = intStr.padStart(minDigits, "0");

  if (hasGrouping) {
    s = addGroupSeparator(s, locale.groupSeparator);
  }

  // Handle # and ? — trim leading zeros beyond what # allows, pad with spaces for ?
  const totalDigitSlots = digitParts.length;
  const required = digitParts.filter(p => p.char === "0").length;
  const optional = digitParts.filter(p => p.char === "#").length;
  const spaced = digitParts.filter(p => p.char === "?").length;

  // For simplicity, # hides leading zeros, ? replaces them with spaces
  if (optional > 0 || spaced > 0) {
    // Strip unnecessary leading zeros not required by "0" placeholders
    const rawLen = s.replace(/,/g, "").length;
    const extraLeading = rawLen - Math.max(required, rawLen);
    // Replace with spaces for "?"
    if (spaced > 0 && rawLen < totalDigitSlots) {
      const pad = " ".repeat(totalDigitSlots - rawLen);
      s = pad + s;
    }
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

function formatFraction(fracStr: string, parts: Extract<FormatPart, { kind: "digit" }>[]): string {
  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const digit = fracStr[i] ?? "0";
    if (parts[i].char === "0") {
      result += digit;
    } else if (parts[i].char === "#") {
      result += digit === "0" && i >= fracStr.replace(/0+$/, "").length ? "" : digit;
    } else {
      result += digit === "0" && i >= fracStr.replace(/0+$/, "").length ? " " : digit;
    }
  }
  return result;
}

function applyLiterals(parts: FormatPart[], numericStr: string, _core: string, _hasPercent: boolean): string {
  // Rebuild the full string by walking parts and inserting numericStr where digits are
  // Simplified: literals before digit zone go before, literals after go after
  let before = "";
  let after = "";
  let inDigitZone = false;
  let pastDigitZone = false;

  for (const p of parts) {
    if (p.kind === "digit" || p.kind === "decimal" || p.kind === "group" || p.kind === "scientific" || p.kind === "percent") {
      inDigitZone = true;
    } else if (p.kind === "literal") {
      if (!inDigitZone) before += p.value;
      else after += p.value;
    }
  }

  return before + numericStr + after;
}
```

> **Note:** This is a working first implementation. Edge cases (trailing `#` trimming, `?` alignment, interaction between grouping and scaling commas) will be caught by the test corpus in Task 14 and refined iteratively.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/formatter/numeric.test.ts`
Expected: PASS (or near-pass — fix any failures before proceeding).

**Step 5: Commit**

```bash
git add src/formatter/numeric.ts tests/formatter/numeric.test.ts
git commit -m "feat: implement basic numeric formatter"
```

---

## Task 10: Numeric formatter — scientific notation and fractions

**Files:**
- Modify: `src/formatter/numeric.ts`
- Create: `tests/formatter/numeric-scientific.test.ts`
- Create: `tests/formatter/numeric-fractions.test.ts`

**Step 1: Write scientific notation tests**

```ts
// tests/formatter/numeric-scientific.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/parse.js";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("scientific notation", () => {
  it("#0.0E+0 formats 12300 correctly", () => {
    expect(fmt("#0.0E+0", 12300)).toBe("12.3E+3");
  });

  it("0.00E+00 formats 0.00123 correctly", () => {
    expect(fmt("0.00E+00", 0.00123)).toBe("1.23E-03");
  });

  it("##0.0E+0 formats 1230000 correctly", () => {
    expect(fmt("##0.0E+0", 1230000)).toBe("1.2E+6");
  });
});
```

**Step 2: Write fraction tests**

```ts
// tests/formatter/numeric-fractions.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/parse.js";
import { formatNumeric } from "../../src/formatter/numeric.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, value: number) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatNumeric(ast.sections[0], Math.abs(value), enUS);
}

describe("fractions", () => {
  it("# ?/? formats 1.5 as 1 1/2", () => {
    expect(fmt("# ?/?", 1.5)).toBe("1 1/2");
  });

  it("# ?/? formats 2.25 as 2 1/4", () => {
    expect(fmt("# ?/?", 2.25)).toBe("2 1/4");
  });

  it("?/? formats 0.5 as 1/2", () => {
    expect(fmt("?/?", 0.5)).toBe("1/2");
  });

  it("# ?/4 uses fixed denominator", () => {
    expect(fmt("# ?/4", 1.5)).toBe("1 2/4");
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `npx vitest run tests/formatter/numeric-scientific.test.ts tests/formatter/numeric-fractions.test.ts`
Expected: FAIL.

**Step 4: Extend numeric.ts with scientific and fraction support**

Add `formatScientific` and `formatFractionDisplay` helpers to `src/formatter/numeric.ts`, and route to them in `formatNumeric` when the section contains `{ kind: "scientific" }` or `{ kind: "fraction" }` parts.

Scientific algorithm:
1. Determine mantissa group size from digit count before `E` (e.g. `##0` = group of 3)
2. Compute exponent as `floor(log10(value) / groupSize) * groupSize`
3. Compute mantissa as `value / 10^exponent`
4. Format mantissa and exponent with their respective digit placeholders

Fraction algorithm:
1. Separate whole number from fractional part
2. If denominator is fixed: use it directly, compute numerator = `round(frac * denominator)`
3. If denominator is variable: use Stern-Brocot or best-rational-approximation algorithm to find simplest fraction within the digit count constraint
4. Format with space padding for `?` placeholders

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/formatter/numeric-scientific.test.ts tests/formatter/numeric-fractions.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/formatter/numeric.ts tests/formatter/numeric-scientific.test.ts tests/formatter/numeric-fractions.test.ts
git commit -m "feat: add scientific notation and fraction formatting"
```

---

## Task 11: Date/time formatter

**Files:**
- Create: `src/formatter/datetime.ts`
- Create: `tests/formatter/datetime.test.ts`

**Step 1: Write failing tests**

```ts
// tests/formatter/datetime.test.ts
import { describe, it, expect } from "vitest";
import { formatDateTime } from "../../src/formatter/datetime.js";
import { parse } from "../../src/parser/parse.js";
import { enUS } from "../../src/locale/enUS.js";

function fmt(format: string, date: Date) {
  const ast = parse(format);
  if (ast.kind !== "sections") throw new Error();
  return formatDateTime(ast.sections[0], date, enUS);
}

// Use a fixed reference date: 2024-03-15 14:05:09.123 (Friday)
const D = new Date(2024, 2, 15, 14, 5, 9, 123);
const MIDNIGHT = new Date(2024, 2, 15, 0, 0, 0);
const NOON = new Date(2024, 2, 15, 12, 0, 0);

describe("formatDateTime", () => {
  it("yyyy formats 4-digit year", () => expect(fmt("yyyy", D)).toBe("2024"));
  it("yy formats 2-digit year", () => expect(fmt("yy", D)).toBe("24"));

  it("mmmm formats full month name", () => expect(fmt("mmmm", D)).toBe("March"));
  it("mmm formats abbreviated month", () => expect(fmt("mmm", D)).toBe("Mar"));
  it("mm formats zero-padded month", () => expect(fmt("mm", D)).toBe("03"));
  it("m formats month without padding", () => expect(fmt("m", D)).toBe("3"));

  it("dddd formats full weekday", () => expect(fmt("dddd", D)).toBe("Friday"));
  it("ddd formats abbreviated weekday", () => expect(fmt("ddd", D)).toBe("Fri"));
  it("dd formats zero-padded day", () => expect(fmt("dd", D)).toBe("15"));
  it("d formats day without padding", () => expect(fmt("d", D)).toBe("15"));

  it("hh formats zero-padded 24h hour", () => expect(fmt("hh", D)).toBe("14"));
  it("h formats 24h hour without padding", () => expect(fmt("h", D)).toBe("14"));

  it("hh AM/PM formats 12-hour with padding", () => expect(fmt("hh AM/PM", D)).toBe("02 PM"));
  it("h AM/PM at midnight shows 12", () => expect(fmt("h AM/PM", MIDNIGHT)).toBe("12 AM"));
  it("h AM/PM at noon shows 12 PM", () => expect(fmt("h AM/PM", NOON)).toBe("12 PM"));

  it("mm as minute after hh", () => expect(fmt("hh:mm", D)).toBe("14:05"));
  it("ss formats zero-padded seconds", () => expect(fmt("ss", D)).toBe("09"));

  it("full datetime format", () => {
    expect(fmt("yyyy-mm-dd hh:mm:ss", D)).toBe("2024-03-15 14:05:09");
  });

  it("d-mmm-yy format", () => {
    expect(fmt("d-mmm-yy", D)).toBe("15-Mar-24");
  });

  it("A/P formats as A or P", () => {
    expect(fmt("h A/P", D)).toBe("2 P");
    expect(fmt("h A/P", MIDNIGHT)).toBe("12 A");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/formatter/datetime.test.ts`
Expected: FAIL.

**Step 3: Implement formatDateTime**

```ts
// src/formatter/datetime.ts
import type { FormatSection, FormatPart, DateToken } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";

export function formatDateTime(section: FormatSection, date: Date, locale: SheetLocale): string {
  const parts = section.parts;
  const hasAmPm = parts.some(p => p.kind === "date" && (p.token === "ampm" || p.token === "ap"));

  let result = "";
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];

    if (p.kind === "literal") { result += p.value; continue; }
    if (p.kind === "padding" || p.kind === "fill") continue;

    if (p.kind === "elapsed") {
      result += formatElapsed(p.unit, date);
      continue;
    }

    if (p.kind !== "date") continue;

    const isMinute = p.token === "m" || p.token === "mm"
      ? isAdjacentToHourOrSecond(parts, i)
      : false;

    result += formatDateToken(p.token, date, locale, hasAmPm, isMinute);
  }
  return result;
}

function isAdjacentToHourOrSecond(parts: FormatPart[], idx: number): boolean {
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

function formatDateToken(token: DateToken, date: Date, locale: SheetLocale, hasAmPm: boolean, isMinute: boolean): string {
  const y = date.getFullYear();
  const mo = date.getMonth(); // 0-based
  const d = date.getDate();
  const dow = date.getDay(); // 0=Sunday
  const h24 = date.getHours();
  const min = date.getMinutes();
  const sec = date.getSeconds();
  const ms = date.getMilliseconds();

  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hour = hasAmPm ? h12 : h24;

  switch (token) {
    case "yyyy": return String(y);
    case "yy": return String(y).slice(-2);
    case "mmmm": return isMinute ? pad2(min) : locale.monthNames[mo];
    case "mmm": return isMinute ? pad2(min) : locale.shortMonthNames[mo];
    case "mm": return isMinute ? pad2(min) : pad2(mo + 1);
    case "m": return isMinute ? String(min) : String(mo + 1);
    case "mmmmm": return locale.singleLetterMonthNames[mo];
    case "dddd": return locale.dayNames[dow];
    case "ddd": return locale.shortDayNames[dow];
    case "dd": return pad2(d);
    case "d": return String(d);
    case "hh": return pad2(hour);
    case "h": return String(hour);
    case "ss": return pad2(sec);
    case "s": return String(sec);
    case "ampm": return h24 < 12 ? locale.amLabel : locale.pmLabel;
    case "ap": return h24 < 12 ? locale.amLabel[0] : locale.pmLabel[0];
    case "fracSeconds": return String(ms).padStart(3, "0");
    default: return "";
  }
}

function formatElapsed(unit: "h" | "m" | "s", date: Date): string {
  const totalMs = date.getTime();
  const negative = totalMs < 0;
  const abs = Math.abs(totalMs);
  let val: number;
  if (unit === "h") val = Math.floor(abs / 3600000);
  else if (unit === "m") val = Math.floor(abs / 60000);
  else val = Math.floor(abs / 1000);
  return (negative ? "-" : "") + String(val);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/formatter/datetime.test.ts`
Expected: PASS — all tests pass.

**Step 5: Commit**

```bash
git add src/formatter/datetime.ts tests/formatter/datetime.test.ts
git commit -m "feat: implement date/time formatter"
```

---

## Task 12: Section selector and top-level format dispatcher

**Files:**
- Create: `src/formatter/format.ts`
- Create: `tests/formatter/format.test.ts`

**Step 1: Write failing tests**

```ts
// tests/formatter/format.test.ts
import { describe, it, expect } from "vitest";
import { formatValue } from "../../src/formatter/format.js";
import { enUS } from "../../src/locale/enUS.js";

describe("formatValue — general", () => {
  it("formats number with general", () => {
    const result = formatValue(1234.5, null, enUS);
    expect(result).toBe("1234.5");
  });

  it("formats date with general", () => {
    const d = new Date(2024, 2, 15);
    expect(formatValue(d, null, enUS)).toBe("15-Mar-2024");
  });

  it("formats string with general", () => {
    expect(formatValue("hello", null, enUS)).toBe("hello");
  });
});

describe("formatValue — section selection", () => {
  it("1 section applies to positive", () => {
    expect(formatValue(5, "0", enUS)).toBe("5");
  });

  it("1 section applies to negative", () => {
    expect(formatValue(-5, "0", enUS)).toBe("-5");
  });

  it("2 sections: section 1 for negative", () => {
    expect(formatValue(-5, "0;(0)", enUS)).toBe("(5)");
  });

  it("3 sections: section 2 for zero", () => {
    expect(formatValue(0, "0;-0;zero", enUS)).toBe("zero");
  });

  it("4 sections: section 3 for text", () => {
    expect(formatValue("foo", "0;-0;0;[@]", enUS)).toBe("[foo]");
  });

  it("conditional section: [>1000] matches", () => {
    expect(formatValue(5000, "[>1000]0;0", enUS)).toBe("5000");
  });

  it("conditional section: falls back when no match", () => {
    expect(formatValue(500, "[>1000]0;0", enUS)).toBe("500");
  });
});

describe("formatValue — bigint", () => {
  it("formats bigint as number", () => {
    expect(formatValue(12345n, "0", enUS)).toBe("12345");
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run tests/formatter/format.test.ts`
Expected: FAIL.

**Step 3: Implement formatValue**

```ts
// src/formatter/format.ts
import { parse } from "../parser/parse.js";
import type { FormatAST, FormatSection } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";
import { formatNumeric } from "./numeric.js";
import { formatDateTime } from "./datetime.js";
import { formatText } from "./text.js";

export function formatValue(
  value: number | bigint | Date | string,
  formatString: string | null | undefined,
  locale: SheetLocale,
): string {
  const ast = parse(formatString);

  if (ast.kind === "general") {
    return formatGeneral(value, locale);
  }

  const section = selectSection(ast, value);
  return renderSection(section, value, locale);
}

function formatGeneral(value: number | bigint | Date | string, locale: SheetLocale): string {
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

function selectSection(ast: FormatAST & { kind: "sections" }, value: number | bigint | Date | string): FormatSection {
  const sections = ast.sections;

  // Check conditional sections first
  const conditionals = sections.filter(s => s.condition != null);
  if (conditionals.length > 0) {
    const num = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : NaN;
    for (const s of conditionals) {
      if (evalCondition(s.condition!, num)) return s;
    }
    // Fall back to last unconditional section
    const unconditional = sections.filter(s => s.condition == null);
    return unconditional[unconditional.length - 1] ?? sections[sections.length - 1];
  }

  // Standard section selection
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
  // n === 4
  if (num > 0) return sections[0];
  if (num < 0) return sections[1];
  return sections[2];
}

function evalCondition(cond: { operator: string; value: number }, num: number): boolean {
  switch (cond.operator) {
    case ">": return num > cond.value;
    case ">=": return num >= cond.value;
    case "<": return num < cond.value;
    case "<=": return num <= cond.value;
    case "=": return num === cond.value;
    case "<>": return num !== cond.value;
    default: return false;
  }
}

function renderSection(section: FormatSection, value: number | bigint | Date | string, locale: SheetLocale): string {
  const hasDate = section.parts.some(p => p.kind === "date" || p.kind === "elapsed");
  const hasText = section.parts.some(p => p.kind === "text-placeholder");

  if (value instanceof Date || hasDate) {
    const date = value instanceof Date ? value : new Date(Number(value) * 86400000);
    return formatDateTime(section, date, locale);
  }

  if (typeof value === "string" || hasText) {
    return formatText(section, String(value));
  }

  // Numeric
  const num = typeof value === "bigint" ? Number(value) : value as number;
  const negative = num < 0;
  // Only prepend sign if this is a single-section format (multi-section handles sign via section selection)
  const prefix = negative ? "-" : "";
  return prefix + formatNumeric(section, Math.abs(num), locale);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/formatter/format.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/formatter/format.ts tests/formatter/format.test.ts
git commit -m "feat: implement section selector and top-level format dispatcher"
```

---

## Task 13: SheetNumberFormatter class and public exports

**Files:**
- Create: `src/SheetNumberFormatter.ts`
- Modify: `src/index.ts`
- Create: `tests/SheetNumberFormatter.test.ts`

**Step 1: Write failing tests**

```ts
// tests/SheetNumberFormatter.test.ts
import { describe, it, expect } from "vitest";
import { SheetNumberFormatter, enUS, localeFromIntl, ParseError } from "../src/index.js";

const snf = new SheetNumberFormatter();

describe("SheetNumberFormatter.format", () => {
  it("formats a number", () => {
    expect(snf.format(12345.6, "###,##0.00", enUS)).toBe("12,345.60");
  });

  it("formats a date", () => {
    const d = new Date(2024, 2, 15);
    expect(snf.format(d, "yyyy-mm-dd", enUS)).toBe("2024-03-15");
  });

  it("formats a bigint", () => {
    expect(snf.format(9007199254740993n, "0", enUS)).toBe("9007199254740993");
  });

  it("throws ParseError for invalid format", () => {
    expect(() => snf.format(1, '"unclosed', enUS)).toThrow(ParseError);
  });
});

describe("SheetNumberFormatter.compile", () => {
  it("returns a CompiledFormatter that formats correctly", () => {
    const compiled = snf.compile("0.00");
    expect(compiled.format(1.5, enUS)).toBe("1.50");
    expect(compiled.format(2.0, enUS)).toBe("2.00");
  });
});

describe("exports", () => {
  it("exports enUS locale", () => {
    expect(enUS.decimalSeparator).toBe(".");
  });

  it("exports localeFromIntl", () => {
    const loc = localeFromIntl("en-US");
    expect(loc.decimalSeparator).toBe(".");
  });

  it("exports ParseError", () => {
    const err = new ParseError("test", "0", 0);
    expect(err).toBeInstanceOf(Error);
  });
});
```

**Step 2: Run to verify it fails**

Run: `npx vitest run tests/SheetNumberFormatter.test.ts`
Expected: FAIL.

**Step 3: Implement SheetNumberFormatter**

```ts
// src/SheetNumberFormatter.ts
import { parse } from "./parser/parse.js";
import { formatValue } from "./formatter/format.js";
import type { SheetLocale } from "./locale/types.js";

export interface CompiledFormatter {
  format(value: number | bigint | Date, locale: SheetLocale): string;
}

export class SheetNumberFormatter {
  format(value: number | bigint | Date, formatString: string, locale: SheetLocale): string {
    return formatValue(value, formatString, locale);
  }

  compile(formatString: string): CompiledFormatter {
    const ast = parse(formatString); // parse once, validate immediately
    return {
      format: (value: number | bigint | Date, locale: SheetLocale) =>
        formatValue(value, formatString, locale),
    };
  }
}
```

**Step 4: Update src/index.ts**

```ts
// src/index.ts
export { SheetNumberFormatter } from "./SheetNumberFormatter.js";
export type { CompiledFormatter } from "./SheetNumberFormatter.js";
export type { SheetLocale } from "./locale/types.js";
export { enUS } from "./locale/enUS.js";
export { localeFromIntl } from "./locale/localeFromIntl.js";
export { ParseError } from "./errors.js";
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/SheetNumberFormatter.test.ts`
Expected: PASS.

**Step 6: Verify build**

Run: `npm run build`
Expected: `dist/index.js` and `dist/index.d.ts` generated with no errors.

**Step 7: Commit**

```bash
git add src/SheetNumberFormatter.ts src/index.ts tests/SheetNumberFormatter.test.ts
git commit -m "feat: implement SheetNumberFormatter class and public exports"
```

---

## Task 14: Port .NET ExcelNumberFormat test corpus

**Files:**
- Create: `tests/corpus/parser-valid.test.ts`
- Create: `tests/corpus/numeric.test.ts`
- Create: `tests/corpus/datetime.test.ts`
- Create: `tests/corpus/conditions.test.ts`
- Create: `tests/corpus/fractions.test.ts`
- Create: `tests/corpus/scientific.test.ts`
- Create: `tests/corpus/locale.test.ts`

Fetch the raw test file from the .NET repo and port each `[TestCase]` to a TypeScript `{ format, value, expected }` object. Group by test method. Run and fix any failures found.

**Step 1: Fetch the C# test file**

Browse to: https://raw.githubusercontent.com/andersnm/ExcelNumberFormat/master/test/ExcelNumberFormat.Tests/Class1.cs

Read the file and identify all `[TestCase]` entries.

**Step 2: Port TestValid corpus (parser validity)**

```ts
// tests/corpus/parser-valid.test.ts
import { describe, it, expect } from "vitest";
import { parse } from "../../src/parser/parse.js";

// 400+ format strings from .NET ExcelNumberFormat TestValid
const validFormats = [
  "General",
  "0",
  "0.00",
  "#,##0",
  "#,##0.00",
  "0%",
  "0.00%",
  "0.00E+00",
  "#?/?",
  "#??/??",
  // ... port all ~400 strings from TestValid
];

describe("parser — all valid format strings parse without error", () => {
  for (const fmt of validFormats) {
    it(`parses: ${fmt}`, () => {
      expect(() => parse(fmt)).not.toThrow();
    });
  }
});
```

**Step 3: Port TestNumber, TestComma, TestExponent, TestFraction, TestCondition, TestDate, TestTimeSpan**

For each test method, create a data array and iterate:

```ts
const cases = [
  { format: "###,##0.00", value: 12345.6, expected: "12,345.60" },
  // ... one entry per [TestCase] line
];

for (const c of cases) {
  it(`${c.format} | ${c.value} → ${c.expected}`, () => {
    expect(snf.format(c.value, c.format, enUS)).toBe(c.expected);
  });
}
```

**Step 4: Run the corpus tests**

Run: `npx vitest run tests/corpus/`
Expected: Some failures are acceptable on first run. Log each failure with its format string and value.

**Step 5: Fix failures iteratively**

For each failure:
1. Identify which part of the formatter is wrong
2. Write a minimal test that reproduces it
3. Fix the formatter
4. Verify the corpus test now passes

Repeat until all corpus tests pass (or deviations are explicitly documented).

**Step 6: Commit after each batch of fixes**

```bash
git add tests/corpus/ src/formatter/
git commit -m "test: port ExcelNumberFormat corpus and fix formatting edge cases"
```

---

## Task 15: Run full test suite and build

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

**Step 2: Build the package**

Run: `npm run build`
Expected: Clean build, no TypeScript errors, `dist/` contains `index.js` and `index.d.ts`.

**Step 3: Verify public API types in dist**

Open `dist/index.d.ts` and confirm all exports are present:
- `SheetNumberFormatter` class with `format` and `compile`
- `CompiledFormatter` interface
- `SheetLocale` interface
- `enUS` constant
- `localeFromIntl` function
- `ParseError` class

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full test suite and build output"
```
