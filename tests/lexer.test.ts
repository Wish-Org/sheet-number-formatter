import { describe, it, expect } from "vitest";
import { tokenize, Token } from "../src/parser/lexer.js";

describe("tokenize", () => {
  it("tokenizes digit placeholders", () => {
    expect(tokenize("0#?")).toEqual<Token[]>([
      { type: "digit", char: "0", pos: 0 },
      { type: "digit", char: "#", pos: 1 },
      { type: "digit", char: "?", pos: 2 },
    ]);
  });

  it("tokenizes decimal and group", () => {
    expect(tokenize(".,")).toEqual<Token[]>([
      { type: "decimal", pos: 0 },
      { type: "group", pos: 1 },
    ]);
  });

  it("tokenizes section separator", () => {
    expect(tokenize(";")).toEqual<Token[]>([
      { type: "section-sep", pos: 0 },
    ]);
  });

  it("tokenizes quoted literal", () => {
    expect(tokenize('"hello"')).toEqual<Token[]>([
      { type: "literal", value: "hello", pos: 0 },
    ]);
  });

  it("tokenizes escaped character", () => {
    expect(tokenize("\\$")).toEqual<Token[]>([
      { type: "literal", value: "$", pos: 0 },
    ]);
  });

  it("tokenizes percent", () => {
    expect(tokenize("%")).toEqual<Token[]>([
      { type: "percent", pos: 0 },
    ]);
  });

  it("tokenizes text placeholder", () => {
    expect(tokenize("@")).toEqual<Token[]>([
      { type: "text-placeholder", pos: 0 },
    ]);
  });

  it("tokenizes padding token", () => {
    expect(tokenize("_ ")).toEqual<Token[]>([
      { type: "padding", char: " ", pos: 0 },
    ]);
  });

  it("tokenizes fill token", () => {
    expect(tokenize("*-")).toEqual<Token[]>([
      { type: "fill", char: "-", pos: 0 },
    ]);
  });

  it("tokenizes date tokens in descending length order", () => {
    const tokens = tokenize("yyyy");
    expect(tokens).toEqual<Token[]>([
      { type: "date-token", token: "yyyy", pos: 0 },
    ]);
  });

  it("tokenizes mm as ambiguous month/minute", () => {
    const tokens = tokenize("mm");
    expect(tokens[0]).toMatchObject({ type: "date-token", token: "mm" });
  });

  it("tokenizes elapsed time [h]", () => {
    expect(tokenize("[h]")).toEqual<Token[]>([
      { type: "elapsed", unit: "h", pos: 0 },
    ]);
  });

  it("tokenizes elapsed time [mm]", () => {
    expect(tokenize("[mm]")).toEqual<Token[]>([
      { type: "elapsed", unit: "m", pos: 0 },
    ]);
  });

  it("tokenizes condition [>100]", () => {
    expect(tokenize("[>100]")).toEqual<Token[]>([
      { type: "condition", operator: ">", value: 100, pos: 0 },
    ]);
  });

  it("tokenizes condition [<>0]", () => {
    expect(tokenize("[<>0]")).toEqual<Token[]>([
      { type: "condition", operator: "<>", value: 0, pos: 0 },
    ]);
  });

  it("tokenizes color [Red]", () => {
    expect(tokenize("[Red]")).toEqual<Token[]>([
      { type: "color", value: "Red", pos: 0 },
    ]);
  });

  it("tokenizes currency [$USD]", () => {
    expect(tokenize("[$USD]")).toEqual<Token[]>([
      { type: "currency", symbol: "USD", pos: 0 },
    ]);
  });

  it("tokenizes currency [$€-1809] stripping locale code", () => {
    expect(tokenize("[$€-1809]")).toEqual<Token[]>([
      { type: "currency", symbol: "€", pos: 0 },
    ]);
  });

  it("tokenizes scientific notation E+00", () => {
    expect(tokenize("E+00")).toEqual<Token[]>([
      { type: "scientific", forceSign: true, digits: "00", pos: 0 },
    ]);
  });

  it("tokenizes scientific notation E-0", () => {
    expect(tokenize("E-0")).toEqual<Token[]>([
      { type: "scientific", forceSign: false, digits: "0", pos: 0 },
    ]);
  });

  it("throws ParseError on unclosed quoted string", () => {
    expect(() => tokenize('"abc')).toThrow("Unclosed quoted string");
  });

  it("tokenizes standalone literals ($, +, -, :, /)", () => {
    const tokens = tokenize("$+-()/:");
    expect(tokens.every(t => t.type === "literal")).toBe(true);
  });
});
