# @wish-org/sheet-number-formatter

## 0.2.0

### Minor Changes

- 003eef6: Init
- 00b96b5: feat: enhance number formatting tests and add new cases for fractions and validity

  - Updated numeric tests to include digit alignment with '?' placeholders and locale-specific formatting.
  - Added tests for scientific notation with large values.
  - Refactored format tests to use a common formatting function for consistency.
  - Removed obsolete text formatting tests.
  - Enhanced lexer and parser tests to include digit specifications for elapsed time tokens.
  - Introduced comprehensive tests for fraction formatting, covering various cases including space and zero padding.
  - Added validation tests to ensure all C# valid format strings compile successfully.
