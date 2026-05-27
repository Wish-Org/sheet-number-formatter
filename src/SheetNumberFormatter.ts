import { parse } from "./parser/parse.js";
import { formatValue } from "./formatter/format.js";
import { ParseError } from "./errors.js";
import type { SheetLocale } from "./locale/types.js";

export interface CompiledFormatter {
  format(value: number | bigint | Date, locale: SheetLocale): string;
}

export type CompileResult =
  | { isSuccess: true;  formatter: CompiledFormatter }
  | { isSuccess: false; errors: ParseError[] };

export class SheetNumberFormatter {
  compile(formatString: string): CompileResult {
    try {
      const ast = parse(formatString);
      return {
        isSuccess: true,
        formatter: {
          format: (value: number | bigint | Date, locale: SheetLocale) =>
            formatValue(value, ast, locale),
        },
      };
    } catch (e) {
      return {
        isSuccess: false,
        errors: [e instanceof ParseError ? e : new ParseError(String(e), formatString, 0)],
      };
    }
  }
}
