const ERROR_TYPES = ['TokenError', 'JloxSyntaxError', 'DeveloperError'];

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

export class GrammarError extends Error {
  name: ErrorType;

  constructor({
    name,
    message,
  }: {
    name: ErrorType,
    message: string,
  }) {
    super(message);
    this.name = name;
  }
}

