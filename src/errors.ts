export class ParseError {
  readonly message: string;

  constructor(
    message: string,
    readonly formatString: string,
    readonly position: number,
  ) {
    this.message = `${message} at position ${position} in "${formatString}"`;
  }
}
