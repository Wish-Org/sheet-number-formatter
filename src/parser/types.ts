export type FormatAST =
  | { kind: "general" }
  | { kind: "sections"; sections: FormatSection[] };

export type FormatSection = {
  condition?: Condition;
  color?: string;
  parts: FormatPart[];
};

export type Condition = {
  operator: ">" | ">=" | "<" | "<=" | "=" | "<>";
  value: number;
};

export type DateToken =
  | "yyyy" | "yy"
  | "mmmm" | "mmm" | "mm" | "m"
  | "dddd" | "ddd" | "dd" | "d"
  | "hh" | "h"
  | "ss" | "s"
  | "ampm" | "ap"
  | "fracSeconds";

export type FormatPart =
  | { kind: "digit"; char: "0" | "#" | "?" }
  | { kind: "decimal" }
  | { kind: "group" }
  | { kind: "percent" }
  | { kind: "scientific"; forceSign: boolean; digits: string }
  | { kind: "fraction"; numerator: string; denominator: string | number }
  | { kind: "date"; token: DateToken }
  | { kind: "elapsed"; unit: "h" | "m" | "s" }
  | { kind: "text-placeholder" }
  | { kind: "literal"; value: string }
  | { kind: "padding"; char: string }
  | { kind: "fill"; char: string };
