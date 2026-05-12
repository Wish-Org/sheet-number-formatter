import type { FormatSection } from "../parser/types.js";

export function formatText(section: FormatSection, value: string): string {
  let result = "";
  for (const part of section.parts) {
    if (part.kind === "text-placeholder") {
      result += value;
    } else if (part.kind === "literal") {
      result += part.value;
    }
  }
  return result;
}
