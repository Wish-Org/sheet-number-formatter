interface SheetLocale {
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

interface CompiledFormatter {
    format(value: number | bigint | Date | string, locale: SheetLocale): string;
}
declare class SheetNumberFormatter {
    format(value: number | bigint | Date | string, formatString: string | null | undefined, locale: SheetLocale): string;
    compile(formatString: string): CompiledFormatter;
}

declare const enUS: SheetLocale;

declare function localeFromIntl(tag: string): SheetLocale;

declare class ParseError extends Error {
    readonly formatString: string;
    readonly position: number;
    constructor(message: string, formatString: string, position: number);
}

export { type CompiledFormatter, ParseError, type SheetLocale, SheetNumberFormatter, enUS, localeFromIntl };
