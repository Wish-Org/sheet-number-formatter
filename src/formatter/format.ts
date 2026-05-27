import { parse } from "../parser/parse.js";
import type { FormatAST, FormatSection } from "../parser/types.js";
import type { SheetLocale } from "../locale/types.js";
import { formatNumeric } from "./numeric.js";
import { formatDateTime } from "./datetime.js";

export { parse };

export function formatValue(
  value: number | bigint | Date,
  ast: FormatAST,
  locale: SheetLocale,
): string {
  if (ast.kind === "general") {
    return formatGeneral(value, locale);
  }

  const { section, addMinus } = selectSection(ast, value);
  const formatted = renderSection(section, value, locale);
  if (addMinus) return "-" + formatted;
  const isNegative = (typeof value === "number" && value < 0) || (typeof value === "bigint" && value < 0n);
  if (ast.sections.length === 1 && isNegative) {
    return "-" + formatted;
  }
  return formatted;
}

function formatGeneral(value: number | bigint | Date, locale: SheetLocale): string {
  if (value instanceof Date) {
    const d = value.getDate();
    const mon = locale.shortMonthNames[value.getMonth()];
    const y = value.getFullYear();
    return `${d}-${mon}-${y}`;
  }
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

function selectSection(
  ast: FormatAST & { kind: "sections" },
  value: number | bigint | Date,
): { section: FormatSection; addMinus: boolean } {
  const sections = ast.sections;
  const n = sections.length;

  const hasSomeCondition = sections.some(s => s.condition != null);

  if (!hasSomeCondition) {
    if (n === 1) return { section: sections[0], addMinus: false };
    if (value instanceof Date) return { section: sections[0], addMinus: false };
    const num = typeof value === "bigint" ? Number(value) : value as number;
    if (n === 2) return { section: num < 0 ? sections[1] : sections[0], addMinus: false };
    if (num > 0) return { section: sections[0], addMinus: false };
    if (num < 0) return { section: sections[1], addMinus: false };
    return { section: sections[2], addMinus: false };
  }

  // Mixed conditional/unconditional sections
  const num = typeof value === "bigint" ? Number(value) : typeof value === "number" ? value : NaN;

  // Unconditional section 0 always handles positive values
  if (num > 0 && sections[0].condition == null) {
    return { section: sections[0], addMinus: false };
  }

  // Check conditional sections in order
  for (const s of sections) {
    if (s.condition != null && evalCondition(s.condition, num)) {
      return { section: s, addMinus: false };
    }
  }

  // Fallback: last non-text unconditional section; prepend minus only if it's a 3rd+ section
  let fallbackIdx = sections.length - 1;
  for (let i = sections.length - 1; i >= 0; i--) {
    if (sections[i].condition == null && !sections[i].parts.some(p => p.kind === "text-placeholder")) {
      fallbackIdx = i;
      break;
    }
  }

  return { section: sections[fallbackIdx], addMinus: num < 0 && fallbackIdx >= 2 };
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
  value: number | bigint | Date,
  locale: SheetLocale,
): string {
  const hasDate = section.parts.some(p => p.kind === "date" || p.kind === "elapsed");

  if (value instanceof Date || hasDate) {
    const date = value instanceof Date ? value : new Date(Number(value) * 86400000);
    return formatDateTime(section, date, locale);
  }

  if (typeof value === "bigint") {
    return formatNumeric(section, value < 0n ? -value : value, locale);
  }
  return formatNumeric(section, Math.abs(value), locale);
}
