export class ParseError extends Error {
  constructor(
    message: string,
    readonly formatString: string,
    readonly position: number,
  ) {
    super(`${message} at position ${position} in "${formatString}"`);
    this.name = "ParseError";
  }
}
