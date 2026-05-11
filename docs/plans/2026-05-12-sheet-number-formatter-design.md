# Design: sheet-number-formatter

Date: 2026-05-12

## Overview

A standalone TypeScript npm library that formats `number`, `bigint`, and `Date` values using Excel / Google Sheets-style format strings. Replaces `ssf` and Angular date pipes in Better Reports.

`Temporal` support is deferred until native browser support matures.

---

## Constraints

- Browser-only ESM output (no Node-only APIs, no CJS)
- No internal caching (callers cache parsed formatters)
- No dependency on `ssf` or Angular
- Hand-written parser (no parser combinator library)
- `Temporal` deferred to a future version

---

## Tooling

| Concern | Choice |
|---------|--------|
| Build | `tsup` → ESM + `.d.ts` |
| Tests | Vitest |
| Language | TypeScript strict mode |

---

## Project Structure

```
sheet-number-formatter/
├── src/
│   ├── index.ts                  # Public exports
│   ├── SheetNumberFormatter.ts   # Main class
│   ├── parser/
│   │   ├── parse.ts              # Entry point: string → FormatAST
│   │   ├── lexer.ts              # Character-level tokenizer
│   │   └── types.ts              # AST node types
│   ├── formatter/
│   │   ├── format.ts             # Entry point: FormatAST + value + locale → string
│   │   ├── numeric.ts            # Numeric formatting
│   │   ├── datetime.ts           # Date/time formatting
│   │   └── text.ts               # Text/@ formatting
│   ├── locale/
│   │   ├── types.ts              # SheetLocale interface
│   │   ├── enUS.ts               # Built-in en-US locale
│   │   └── localeFromIntl.ts     # Intl API → SheetLocale helper
│   └── errors.ts                 # ParseError class
├── tests/
├── package.json
└── tsconfig.json
```

---

## Public API

```ts
class SheetNumberFormatter {
  // One-shot: parse and format in a single call
  format(value: number | bigint | Date, formatString: string, locale: SheetLocale): string;

  // Pre-parse for reuse across many values
  compile(formatString: string): CompiledFormatter;
}

interface CompiledFormatter {
  format(value: number | bigint | Date, locale: SheetLocale): string;
}

interface SheetLocale {
  decimalSeparator: string;
  groupSeparator: string;
  dateSeparator: string;
  monthNames: string[];              // 12 full names
  shortMonthNames: string[];         // 12 abbreviated (3-letter)
  singleLetterMonthNames: string[];  // 12 single-letter
  dayNames: string[];                // 7 full names (Sunday first)
  shortDayNames: string[];           // 7 abbreviated
  amLabel: string;
  pmLabel: string;
}

// Build a SheetLocale from the browser's Intl API — call once per locale tag, cache the result
function localeFromIntl(locale: string): SheetLocale;

// Built-in default locale for tests and fallback
const enUS: SheetLocale;

class ParseError extends Error {
  readonly formatString: string;
  readonly position: number;
}
```

### Usage pattern (Better Reports migration)

```ts
// App init — called once per locale, result cached at service level
const locale = localeFromIntl("fr-FR");

// Per-value formatting — equivalent to current SpreadsheetFormatter.format()
const snf = new SheetNumberFormatter();
snf.format(12345.6, "###,##0.00", locale); // "12 345,60"

// High-frequency paths — pre-parse and reuse
const compiled = snf.compile("###,##0.00");
compiled.format(12345.6, locale);
compiled.format(99.9, locale);
```

---

## Parser Design

Hand-written recursive descent parser, two phases:

### Phase 1 — Lexer (`lexer.ts`)

Walks the format string character by character and emits typed tokens:

- Digit placeholders: `0`, `#`, `?`
- Date/time tokens: `yyyy`, `yy`, `mmmm`, `mmm`, `mm`, `m`, `dddd`, `ddd`, `dd`, `d`, `hh`, `h`, `ss`, `s`, etc.
- Elapsed time: `[h]`, `[m]`, `[s]`
- Condition brackets: `[>x]`, `[>=x]`, `[<x]`, `[<=x]`, `[=x]`, `[<>x]`
- Color brackets: `[Red]`, `[Color3]`, etc.
- Currency brackets: `[$symbol-localeCode]`
- Quoted literals: `"text"`
- Escaped characters: `\x`
- Structural: `.`, `,`, `;`, `%`, `@`, `_x`, `*x`, `E+`, `E-`

### Phase 2 — Parser (`parse.ts`)

- Splits token stream into 1–4 sections on `;`
- Resolves `m`/`mm` ambiguity: token is a **minute** if immediately preceded or followed by an `h`/`hh` or `s`/`ss` token; otherwise a **month**
- Treats `null`, `""`, and `"General"` as equivalent → produces a `GeneralSection` sentinel
- Extracts currency symbol from `[$symbol-localeCode]`; ignores locale code suffix
- Parses but flags as no-op: colors, padding (`_x`), fill (`*x`)
- Throws `ParseError(message, formatString, position)` on invalid input

### AST types (`types.ts`)

```ts
type FormatAST =
  | { kind: "general" }
  | { kind: "sections"; sections: FormatSection[] };

type FormatSection = {
  condition?: Condition;    // [>x] etc. — up to 2 conditional sections
  color?: string;           // parsed, ignored in output
  parts: FormatPart[];
};

type Condition = {
  operator: ">" | ">=" | "<" | "<=" | "=" | "<>";
  value: number;
};

type FormatPart =
  | { kind: "digit"; char: "0" | "#" | "?" }
  | { kind: "decimal" }
  | { kind: "group" }
  | { kind: "percent" }
  | { kind: "scientific"; forceSign: boolean; digits: string }
  | { kind: "fraction"; numerator: string; denominator: string | number }
  | { kind: "date"; token: DateToken }
  | { kind: "elapsed"; unit: "h" | "m" | "s" }
  | { kind: "text-placeholder" }      // @
  | { kind: "literal"; value: string }
  | { kind: "padding"; char: string } // _x — parsed, no-op
  | { kind: "fill"; char: string };   // *x — parsed, no-op

type DateToken =
  | "yyyy" | "yy"
  | "mmmm" | "mmm" | "mm" | "m"
  | "dddd" | "ddd" | "dd" | "d"
  | "hh" | "h" | "ss" | "s"
  | "ampm" | "ap"
  | "fracSeconds";
```

---

## Formatter Design

### Section selection (`format.ts`)

1. If AST is `"general"` → apply default formatting (number: significant digits; date: `d-mmm-yyyy`; text: as-is)
2. If 1 section → apply to all values
3. If 2 sections → section 0 = positive/zero, section 1 = negative
4. If 3 sections → section 0 = positive, section 1 = negative, section 2 = zero
5. If 4 sections → section 0 = positive, section 1 = negative, section 2 = zero, section 3 = text
6. If sections have conditions → evaluate in order, first match wins; fall back to last unconditional section

### Numeric renderer (`numeric.ts`)

- Determines integer and decimal digit counts from `0`/`#`/`?` placeholders
- Applies grouping (`,` between integer digit groups), scaling (trailing `,` = ÷1000 each)
- Applies percent (`%` = ×100)
- Handles scientific notation: normalises mantissa, formats exponent
- Handles fractions: integer part + numerator/denominator; fixed or variable denominator
- `?` placeholders produce spaces for missing digits (alignment)
- Negative values: sign is stripped before formatting; section selection handles the sign

### Date/time renderer (`datetime.ts`)

- Extracts year, month, day, hour, minute, second, millisecond from `Date`
- `h`/`hh`: 12-hour if AM/PM marker present in section, else 24-hour
- `m`/`mm` after `h`/`hh` or before `s`/`ss` → minute; otherwise → month
- AM/PM: case of output matches case of token (`AM/PM` → `AM`, `am/pm` → `am`, `A/P` → `A`)
- `dateSeparator` from locale applied to `/` in date tokens

### Elapsed time renderer (within `datetime.ts`)

- Value is a `number` (total seconds, or days as Excel serial)
- `[h]` = total hours (may exceed 24); `[m]` = total minutes; `[s]` = total seconds
- Negative values: prepend `-`, format absolute value

### Text renderer (`text.ts`)

- `@` is replaced with the string representation of the value
- Literals pass through unchanged

---

## Locale

### `SheetLocale` construction

`localeFromIntl(locale: string): SheetLocale` uses:
- `Intl.NumberFormat` to extract `decimalSeparator` and `groupSeparator`
- `Intl.DateTimeFormat` to extract month names (full, abbreviated, narrow), day names (full, abbreviated), and `dateSeparator`
- Hard-coded `amLabel`/`pmLabel` derived from a formatted AM/PM probe

Call once per locale tag; cache the result at app/service level.

### Built-in `enUS`

Hard-coded constant — used for tests, as a fallback, and for environments where `Intl` data is unavailable.

---

## Error Handling

```ts
class ParseError extends Error {
  constructor(message: string, formatString: string, position: number)
}
```

Example messages:
```
ParseError: Unexpected character '@' at position 4 in "0.00@#"
ParseError: Unclosed quoted string starting at position 3 in '0.0"abc'
ParseError: Too many sections (max 4) in "0;0;0;0;0"
ParseError: Invalid condition operator at position 1 in "[>>0]0"
```

Runtime type errors (wrong value type) throw standard `TypeError`.

---

## Testing Strategy

All tests are data-driven objects:

```ts
interface FormatCase {
  format: string;
  value: number | bigint | Date;
  locale: SheetLocale;
  expected: string;
}
```

### Test categories

| Category | Notes |
|----------|-------|
| Parser validity | 400+ real-world format strings ported from .NET ExcelNumberFormat `TestValid` corpus |
| Parser errors | Invalid strings → `ParseError` with correct position |
| General format | `null`, `""`, `"General"` produce identical output |
| Numeric | Digit placeholders, grouping, decimals, percent, scaling, scientific, fractions |
| Fraction alignment | `?` placeholder space-padding |
| Date/time | All date/time tokens, AM/PM variants, 12h vs 24h, midnight/noon edge cases |
| Elapsed time | `[h]`, `[m]`, `[s]` — positive and negative values |
| Text | `@` placeholder, literals |
| Section selection | 1–4 sections, positive/negative/zero/text, conditional operators |
| Locale | Decimal/group/date separators, month/day names — `da-DK`, `fr-FR`, `de-DE` etc. |
| `bigint` input | Large identifiers, safe/unsafe integer boundary |
| Edge cases | `0`, `NaN`, `Infinity`, empty string value |

Where output is ambiguous, validate against actual Excel / Google Sheets. Document known deviations.

---

## Out of Scope (initial version)

| Feature | Status |
|---------|--------|
| `Temporal` input type | Deferred — add when native browser support matures |
| Color output (`[Red]`) | Parsed, ignored |
| Padding (`_x`) and fill (`*x`) | Parsed, no-op |
| 1900/1904 serial date systems | Not needed — we accept `Date` objects |
| `[DBNum1]`, `[ENG]`, `[HIJ]` calendar modifiers | Parsed as unknown bracket, ignored |
| Internal caching | Caller responsibility |
| 100% Excel compatibility | Best-effort; deviations documented |
