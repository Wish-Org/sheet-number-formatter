import { describe, it, expect } from "vitest";
import { parse } from "../src/parser/parse.js";
import { ParseError } from "../src/errors.js";

describe("parse", () => {
  it("returns general AST for null", () => {
    expect(parse(null)).toEqual({ kind: "general" });
  });

  it("returns general AST for empty string", () => {
    expect(parse("")).toEqual({ kind: "general" });
  });

  it("returns general AST for 'General'", () => {
    expect(parse("General")).toEqual({ kind: "general" });
  });

  it("parses single section with digit placeholder", () => {
    const ast = parse("0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(1);
    expect(ast.sections[0].parts).toContainEqual({ kind: "digit", char: "0" });
  });

  it("parses two sections", () => {
    const ast = parse("0;-0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(2);
  });

  it("parses four sections", () => {
    const ast = parse("0;-0;0;@");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections).toHaveLength(4);
  });

  it("throws ParseError for more than 4 sections", () => {
    expect(() => parse("0;0;0;0;0")).toThrow(ParseError);
  });

  it("parses condition in section", () => {
    const ast = parse("[>1000]0;0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].condition).toEqual({ operator: ">", value: 1000 });
  });

  it("parses color in section", () => {
    const ast = parse("[Red]0");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].color).toBe("Red");
  });

  it("resolves mm as month when not adjacent to h/s", () => {
    const ast = parse("mm/dd/yyyy");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    const firstPart = ast.sections[0].parts[0];
    expect(firstPart).toEqual({ kind: "date", token: "mm" });
  });

  it("resolves mm as minute when after hh", () => {
    const ast = parse("hh:mm:ss");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    const mmPart = ast.sections[0].parts.find(
      p => p.kind === "date" && (p as { kind: "date"; token: string }).token === "mm"
    );
    expect(mmPart).toEqual({ kind: "date", token: "mm" });
  });

  it("parses elapsed time", () => {
    const ast = parse("[h]:mm:ss");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "elapsed", unit: "h" });
  });

  it("parses literal text", () => {
    const ast = parse('"hello"');
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "literal", value: "hello" });
  });

  it("parses text placeholder @", () => {
    const ast = parse("@");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts[0]).toEqual({ kind: "text-placeholder" });
  });

  it("parses scientific notation", () => {
    const ast = parse("0.00E+00");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts).toContainEqual({ kind: "scientific", forceSign: true, digits: "00" });
  });

  it("parses percent", () => {
    const ast = parse("0%");
    expect(ast.kind).toBe("sections");
    if (ast.kind !== "sections") return;
    expect(ast.sections[0].parts).toContainEqual({ kind: "percent" });
  });
});
