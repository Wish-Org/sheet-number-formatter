# Build `sheet-number-formatter` JavaScript/TypeScript library

## Overview

Create a new JavaScript/TypeScript npm library called `sheet-number-formatter`.

This library will format `number`, `bigint`, `Date`, and `Temporal` values into strings using Excel / Google Sheets-style number format strings.

This is a foundational Better Reports feature. It will eventually replace our current usage of `ssf` and Angular date pipes for all number and date formatting.

---

## Background

Better Reports currently relies on [`[ssf](https://github.com/SheetJS/ssf)`](https://github.com/SheetJS/ssf) for spreadsheet-style formatting, but it has proven buggy. We also have several hard-coded fallbacks that use Angular date pipes for specific date formats. This creates inconsistent and limited formatting behavior because Angular date pipe formats are different from Excel / Google Sheets format strings.

The goal of this project is to provide a reliable, reusable formatter that supports as much of the Excel / Google Sheets custom number format behavior as practical.

Relevant format references:

* Google Sheets API format documentation: https://developers.google.com/workspace/sheets/api/guides/formats
* Excel custom number format overview: https://exceljet.net/articles/custom-number-formats
* Existing .NET implementation used server-side: https://github.com/andersnm/ExcelNumberFormat

Do **not** take design or implementation inspiration from `ssf`.
The .NET `ExcelNumberFormat` project appears solid and may be used as conceptual inspiration.

---

## Goals

* Create a standalone TypeScript npm package named `sheet-number-formatter`
* Parse Excel / Google Sheets-style format strings into reusable formatter objects
* Format `number`, `bigint`, `Date`, and `Temporal` values
* Support locale-aware rendering
* Provide clear user-facing parse errors for invalid format strings
* Build a large test suite covering supported format behavior
* Enable Better Reports to remove dependencies on `ssf` and Angular date pipes

---

## Non-goals

* No caching inside the library
  (Callers such as Better Reports may cache parsed formatters)
* No dependency on Angular
* No dependency on `ssf`
* Full 100% Excel compatibility is not required initially
  (Unsupported features should fail clearly and be documented)

---

## High-level Architecture

### Parser

The parser converts a format string such as:

```
###,##0.00
```

into a reusable `Formatter` object.

The formatter must be reusable across many values without reparsing.

**Requirements:**

* Do not use regex as the main parsing strategy
* Prefer a parser combinator library or a hand-written parser
* Left-to-right parsing
* Clear and actionable error messages for invalid formats
* Produce a structured internal representation (AST or equivalent)

---

### Formatter

The formatter uses:

* Parsed format structure
* Input value (`number | bigint | Date | Temporal`)
* Locale configuration

The locale object should provide:

* Decimal separator
* Group separator
* Month names
* Weekday names
* AM/PM labels
* Maybe more...

---

## Features to Support

### Core format structure

* Sections: positive; negative; zero; text
* 1–4 section handling
* Section fallback logic
* Optional conditions
* Correct section selection rules

---

### Numeric formatting

* Digit placeholders: `0`, `#`, `?`
* Decimal separator `.`
* Grouping separator `,`
* Scaling via trailing commas
* Percent `%`
* Scientific notation `E+00`
* Fractions (e.g. `# ?/?`)

---

### Date and time formatting

* Years: `yy`, `yyyy`
* Months: `m`, `mm`, `mmm`, `mmmm`, `mmmmm`
* Days: `d`, `dd`, `ddd`, `dddd`
* Time: `h`, `hh`, `m`, `mm`, `s`, `ss`
* Fractional seconds: `.0+`
* AM/PM markers
* Elapsed time: `[h]`, `[m]`, `[s]`

---

### Text handling

* Text placeholder: `@`

---

### Literals

* Quoted text: `"text"`
* Escaped characters: `\x`
* Symbols treated as literals or semantic:

  * `$`, `+`, `-`, `(`, `)`, `/`, `:`

---

### Conditional & styling

* Conditions:

  * `[>x]`, `[>=x]`, `[<x]`, `[<=x]`, `[=x]`, `[<>x]`
* Up to 2 conditional sections
* Colors:

  * `[Red]`, `[ColorN]`

(Color tokens may initially be parsed but ignored in output)

---

### Locale & currency

* Currency symbols: `[$...]`
* Locale-aware separators
* Locale-aware month and weekday names

---

### Layout / alignment

* Padding: `_x`
* Fill: `*x`

(These may be parsed but treated as no-ops initially if layout width is out of scope)

---

### Behavior rules

* Context-sensitive tokens (`m` = month vs minute)
* Left-to-right parsing
* Section selection logic

---

## Testing Requirements

A comprehensive test suite is required, covering:

* Parser correctness
* Formatter correctness
* Numeric formats
* Date and time formats
* Elapsed time
* Text formatting
* Conditions and section selection
* Locale variations
* Invalid format handling
* Edge cases for all supported input types

Example test case:

```ts
{
  format: "###,##0.00",
  value: 12345.6,
  locale: enUS,
  expected: "12,345.60"
}
```

---

## Acceptance Criteria

* Package `sheet-number-formatter` exists and builds correctly
* Clean public API for parsing and formatting
* Format strings are parsed into reusable formatter objects
* Supports `number`, `bigint`, `Date`, and `Temporal`
* Locale-aware formatting implemented
* Core numeric and date/time features supported
* Unsupported features clearly documented
* Invalid formats produce useful errors
* Large automated test suite in place
* No dependency on `ssf`
* No dependency on Angular date pipes
* No internal caching
* Suitable for Better Reports migration

---

## Suggested Subtasks

* Define public API and package structure
* Design internal format representation (AST)
* Implement section parsing and selection logic
* Implement numeric token parsing
* Implement date/time token parsing
* Implement literals, conditions, colors, currency parsing
* Implement numeric formatter
* Implement date/time formatter
* Implement elapsed time formatter
* Implement text formatting
* Implement locale model
* Implement error handling
* Add comprehensive unit tests
* Add documentation and examples
* Validate behavior against Excel / Google Sheets
* Prepare Better Reports integration plan

---

## Naming

* npm package: `sheet-number-formatter`
* Suggested main export: `SheetNumberFormatter`