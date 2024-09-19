const ERROR_TYPES = ['TokenError', 'JloxSyntaxError'];

export type ErrorType = typeof ERROR_TYPES[number];

export class CompilerError extends Error {
  name: ErrorType;
  lineNumber: number;

  constructor({
    name,
    message,
    lineNumber,
  }: {
    name: ErrorType,
    message: string,
    lineNumber: number,
  }) {
    super(message);
    this.name = name;
    this.lineNumber = lineNumber;
  }
}

