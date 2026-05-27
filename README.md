# @wish-org/sheet-number-formatter

[![CI](https://github.com/Wish-Org/sheet-number-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/Wish-Org/sheet-number-formatter/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@wish-org/sheet-number-formatter)](https://www.npmjs.com/package/@wish-org/sheet-number-formatter)

Format numbers and dates using the same format string syntax as Excel and Google Sheets.

```ts
const formatter = new SheetNumberFormatter();

const fmt = formatter.compile("#,##0.00");
fmt.formatter.format(1234567.8, enUS); // → "1,234,567.80"
```

## Installation

```bash
npm install @wish-org/sheet-number-formatter
```

## Quick start

```ts
import { SheetNumberFormatter, enUS } from "@wish-org/sheet-number-formatter";

const formatter = new SheetNumberFormatter();

// Compile once, reuse many times
const result = formatter.compile("#,##0.00");

if (result.isSuccess) {
  result.formatter.format(1234.5,  enUS); // "1,234.50"
  result.formatter.format(-42,     enUS); // "-42.00"
  result.formatter.format(0,       enUS); // "0.00"
}
```

## API

### `SheetNumberFormatter`

#### `compile(formatString: string): CompileResult`

Parses a format string and returns a compiled formatter. Compiling is the expensive step — do it once and reuse the result.

```ts
type CompileResult =
  | { isSuccess: true;  formatter: CompiledFormatter }
  | { isSuccess: false; errors: ParseError[] }
```

#### `CompiledFormatter.format(value, locale)`

Formats a `number`, `bigint`, or `Date` using the compiled format and the given locale.

```ts
formatter.format(value: number | bigint | Date, locale: SheetLocale): string
```

---

## Locale

A `SheetLocale` controls decimal/group/date separators, month names, day names, and AM/PM labels.

### Built-in locale

```ts
import { enUS } from "@wish-org/sheet-number-formatter";
```

### Build from a BCP-47 tag

```ts
import { localeFromIntl } from "@wish-org/sheet-number-formatter";

const frFR = localeFromIntl("fr-FR");
const deCH = localeFromIntl("de-CH");
```

`localeFromIntl` uses the `Intl` API — available in Node.js 13+ and all modern browsers.

### Custom locale

```ts
import type { SheetLocale } from "@wish-org/sheet-number-formatter";

const myLocale: SheetLocale = {
  decimalSeparator: ",",
  groupSeparator: ".",
  dateSeparator: ".",
  monthNames: ["Januar", /* … */ "Dezember"],
  shortMonthNames: ["Jan", /* … */ "Dez"],
  singleLetterMonthNames: ["J", /* … */ "D"],
  dayNames: ["Sonntag", /* … */ "Samstag"],
  shortDayNames: ["So", /* … */ "Sa"],
  amLabel: "AM",
  pmLabel: "PM",
};
```

---

## Format string syntax

Format strings follow the Excel / Google Sheets convention.
Multiple sections can be separated by `;` to apply different formats to positive, negative, zero, and text values.

### Numbers

| Format | Input | Output |
|--------|-------|--------|
| `0` | `3.7` | `4` |
| `0.00` | `3.7` | `3.70` |
| `#,##0` | `1234567` | `1,234,567` |
| `#,##0.00` | `1234.5` | `1,234.50` |
| `0%` | `0.175` | `18%` |
| `0.00%` | `0.175` | `17.50%` |
| `0.00E+00` | `12345` | `1.23E+04` |
| `# ??/??` | `1.375` | `1 3/8` |
| `# ?/16` | `1.5` | `1 8/16` |
| `0,,` | `1500000` | `2` (scale by millions) |

**Digit placeholders**

| Char | Meaning |
|------|---------|
| `0` | Always show digit; pad with `0` if absent |
| `#` | Show digit only if significant |
| `?` | Like `#` but pads with a space for alignment |

### Dates & Times

| Format | Input | Output |
|--------|-------|--------|
| `yyyy-mm-dd` | `new Date(2024, 2, 5)` | `2024-03-05` |
| `dd/mm/yyyy` | `new Date(2024, 2, 5)` | `05/03/2024` |
| `d mmmm yyyy` | `new Date(2024, 2, 5)` | `5 March 2024` |
| `ddd, mmm d` | `new Date(2024, 2, 5)` | `Tue, Mar 5` |
| `h:mm AM/PM` | `new Date(2024,0,1,14,5)` | `2:05 PM` |
| `hh:mm:ss` | `new Date(2024,0,1,9,7,3)` | `09:07:03` |
| `hh:mm:ss.000` | `new Date(2024,0,1,9,7,3,45)` | `09:07:03.045` |

**Date tokens**

| Token | Output |
|-------|--------|
| `yyyy` / `yy` | 4-digit / 2-digit year |
| `mmmm` / `mmm` / `mm` / `m` | Full month / short month / 2-digit month / month number |
| `dddd` / `ddd` / `dd` / `d` | Full weekday / short weekday / 2-digit day / day number |
| `hh` / `h` | Hours (padded / unpadded); 12h when AM/PM present |
| `ss` / `s` | Seconds (padded / unpadded) |
| `AM/PM` | AM/PM label from locale |
| `.000` | Fractional seconds (milliseconds) |

> `m` / `mm` are interpreted as **minutes** when immediately following an hour token.

### Elapsed time

Use square brackets to format a duration rather than a clock time.
The input `Date`'s `.getTime()` value is treated as milliseconds.

| Format | Input (ms) | Output |
|--------|-----------|--------|
| `[h]:mm:ss` | `3661000` | `1:01:01` |
| `[mm]:ss` | `3661000` | `61:01` |
| `[ss]` | `3661000` | `3661` |

### Multiple sections

Sections are separated by `;`:

```
positive ; negative ; zero ; text
```

```ts
formatter.compile("#,##0.00 ; (#,##0.00) ; -").formatter.format(-1234.5, enUS);
// → "(1,234.50)"
```

Conditional sections use comparison operators:

```ts
formatter.compile("[>=1000]#,##0 ; 0").formatter.format(500, enUS);  // → "500"
formatter.compile("[>=1000]#,##0 ; 0").formatter.format(1500, enUS); // → "1,500"
```

---

## Error handling

`compile` never throws — invalid format strings are returned as `ParseError` objects:

```ts
const result = formatter.compile("##invalid!!");

if (!result.isSuccess) {
  for (const err of result.errors) {
    console.error(err.message);
  }
}
```

---

## TypeScript

All types are exported:

```ts
import type {
  SheetLocale,
  CompiledFormatter,
  CompileResult,
} from "@wish-org/sheet-number-formatter";

import { ParseError } from "@wish-org/sheet-number-formatter";
```
