import { parse } from "./parser/parse.js";
import { formatValue } from "./formatter/format.js";
import type { SheetLocale } from "./locale/types.js";

export interface CompiledFormatter {
  format(value: number | bigint | Date | string, locale: SheetLocale): string;
}

export class SheetNumberFormatter {
  format(value: number | bigint | Date | string, formatString: string | null | undefined, locale: SheetLocale): string {
    return formatValue(value, formatString, locale);
  }

  compile(formatString: string): CompiledFormatter {
    parse(formatString); // parse once to validate and catch errors early
    return {
      format: (value: number | bigint | Date | string, locale: SheetLocale) =>
        formatValue(value, formatString, locale),
    };
  }
}
