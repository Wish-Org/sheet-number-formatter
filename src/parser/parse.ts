import { tokenize, type Token } from "./lexer.js";
import type { FormatAST, FormatSection, FormatPart, DateToken } from "./types.js";
import { ParseError } from "../errors.js";

export function parse(fmt: string | null | undefined): FormatAST {
  if (fmt == null || fmt === "" || fmt.toLowerCase() === "general") {
    return { kind: "general" };
  }

  const tokens = tokenize(fmt);
  const sectionTokens = splitSections(tokens);

  if (sectionTokens.length > 4) {
    throw new ParseError("Too many sections (max 4)", fmt, 0);
  }

  const sections: FormatSection[] = sectionTokens.map(st => buildSection(st));
  return { kind: "sections", sections };
}

function splitSections(tokens: Token[]): Token[][] {
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

function buildSection(tokens: Token[]): FormatSection {
  let condition: FormatSection["condition"];
  let color: string | undefined;
  const parts: FormatPart[] = [];

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
      const lc = tok.token.toLowerCase();
      if (lc === "am/pm") {
        parts.push({ kind: "date", token: "ampm" });
        continue;
      }
      if (lc === "a/p") {
        parts.push({ kind: "date", token: "ap" });
        continue;
      }
      parts.push({ kind: "date", token: lc as DateToken });
      continue;
    }
  }

  return { condition, color, parts };
}
