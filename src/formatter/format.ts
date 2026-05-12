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
  const formatted = renderSection(section, value, locale);
  // For single-section numeric formats, prepend the minus sign here.
  // Multi-section formats handle sign via section selection.
  const isNegative = (typeof value === "number" && value < 0) || (typeof value === "bigint" && value < 0n);
  if (ast.sections.length === 1 && isNegative) {
    return "-" + formatted;
  }
  return formatted;
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

function selectSection(
  ast: FormatAST & { kind: "sections" },
  value: number | bigint | Date | string,
): FormatSection {
  const sections = ast.sections;

  const conditionals = sections.filter(s => s.condition != null);
  if (conditionals.length > 0) {
    const num = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : NaN;
    for (const s of conditionals) {
      if (evalCondition(s.condition!, num)) return s;
    }
    const unconditional = sections.filter(s => s.condition == null);
    return unconditional[unconditional.length - 1] ?? sections[sections.length - 1];
  }

  const n = sections.length;
  if (n === 1) return sections[0];

  if (typeof value === "string") return n >= 4 ? sections[3] : sections[0];
  if (value instanceof Date) return sections[0];

  const num = typeof value === "bigint" ? Number(value) : value as number;
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
    case ">":  return num > cond.value;
    case ">=": return num >= cond.value;
    case "<":  return num < cond.value;
    case "<=": return num <= cond.value;
    case "=":  return num === cond.value;
    case "<>": return num !== cond.value;
    default:   return false;
  }
}

function renderSection(
  section: FormatSection,
  value: number | bigint | Date | string,
  locale: SheetLocale,
): string {
  const hasDate = section.parts.some(p => p.kind === "date" || p.kind === "elapsed");
  const hasText = section.parts.some(p => p.kind === "text-placeholder");

  if (value instanceof Date || hasDate) {
    const date = value instanceof Date ? value : new Date(Number(value) * 86400000);
    return formatDateTime(section, date, locale);
  }

  if (typeof value === "string" || hasText) {
    return formatText(section, String(value));
  }

  if (typeof value === "bigint") {
    return formatNumeric(section, value < 0n ? -value : value, locale);
  }
  const num = value as number;
  return formatNumeric(section, Math.abs(num), locale);
}
