import { type ReadLine } from '.';

export const TOKEN_NAMES = {
  LEFT_PAREN: 'leftParen',
  RIGHT_PAREN: 'rightParen',
  LEFT_BRACE: 'leftBrace',
  RIGHT_BRACE: 'rightBrace',
  COMMA: 'comma',
  DOT: 'dot',
  MINUS: 'minus',
  PLUS: 'plus',
  SEMICOLON: 'semicolon',
  SLASH: 'slash',
  STAR: 'star',
  BANG: 'bang',
  BANG_EQUAL: 'bangEqual',
  EQUAL: 'equal',
  EQUAL_EQUAL: 'equalEqual',
  GREATER: 'greater',
  GREATER_EQUAL: 'greaterEqual',
  LESS: 'less',
  LESS_EQUAL: 'lessEqual',
  IDENTIFIER: 'identifier',
  STRING: 'string',
  NUMBER: 'number',
  AND: 'and',
  CLASS: 'class',
  ELSE: 'else',
  FALSE: 'false',
  FUN: 'fun',
  FOR: 'for',
  IT: 'it',
  NIL: 'nil',
  OR: 'or',
  PRINT: 'print',
  RETURN: 'return',
  SUPER: 'super',
  THIS: 'this',
  TRUE: 'true',
  VAR: 'var',
  WHILE: 'while',
  EOF: 'eof',
};

type TokenType = {
  name: string;
  test: (buffer: string) => string[] | null;
  consumeFrom: (buffer: string) => string;
};

const tokenTypes: TokenType[] = [
  {
    name: TOKEN_NAMES.LEFT_PAREN,
    test: (buffer: string) => buffer.match(/^\(/),
    consumeFrom: (buffer: string): string => buffer.match(/^\(/)![0],
  },
  {
    name: TOKEN_NAMES.RIGHT_PAREN,
    test: (buffer: string) => buffer.match(/^\)/),
    consumeFrom: (buffer: string): string => buffer.match(/^\)/)![0],
  },
  {
    name: TOKEN_NAMES.EQUAL_EQUAL,
    test: (buffer: string) => buffer.match(/^==/),
    consumeFrom: (buffer: string): string => buffer.match(/^==/)![0],
  },
  {
    name: TOKEN_NAMES.BANG_EQUAL,
    test: (buffer: string) => buffer.match(/^!=/),
    consumeFrom: (buffer: string): string => buffer.match(/^!=/)![0],
  },
  {
    name: TOKEN_NAMES.BANG,
    test: (buffer: string) => buffer.match(/^\!/),
    consumeFrom: (buffer: string): string => buffer.match(/^\!/)![0],
  },
  // TODO: consider if word boundary needed
  {
    name: TOKEN_NAMES.TRUE,
    test: (buffer: string) => buffer.match(/^true\b/),
    consumeFrom: (buffer: string): string => buffer.match(/^true\b/)![0],
  },
  {
    name: TOKEN_NAMES.FALSE,
    test: (buffer: string) => buffer.match(/^false\b/),
    consumeFrom: (buffer: string): string => buffer.match(/^false\b/)![0],
  },
    // UPTO: test tokenizing numbers
  // GREATER: 'greater',
  // GREATER_EQUAL: 'greaterEqual',
  // LESS: 'less',
  // LESS_EQUAL: 'lessEqual',
  // MINUS: 'minus',
  // PLUS: 'plus',
  // SLASH: 'slash',
  // STAR: 'star',
  // NOTE: I'm removing word boundary from numbers and
  // comparisons and operators, so 343>343 is valid.
  // Only exeption is there must be a whitespace after a
  // + or - indended for math. This is to avoid awkwardness from
  // -15--5, for example.
    // TODO: Update the order of these so they match the list in TOKEN_NAMES
  {
    name: TOKEN_NAMES.NUMBER,
    test: (buffer: string) => buffer.match(/^[+-]?[0-9]+(\.[0-9]+)?/),
    consumeFrom: (buffer: string): string => buffer.match(/^[+-]?[0-9]+(\.[0-9]+)?/)![0],
  },
  // GREATER_EQUAL has to come before GREATER to avoid
  // false-positive with GREATER regex. Same with LESS.
  {
    name: TOKEN_NAMES.GREATER_EQUAL,
    test: (buffer: string) => buffer.match(/^>=/),
    consumeFrom: (buffer: string): string => buffer.match(/^>=/)![0],
  },
  {
    name: TOKEN_NAMES.GREATER,
    test: (buffer: string) => buffer.match(/^>/),
    consumeFrom: (buffer: string): string => buffer.match(/^>/)![0],
  },
  {
    name: TOKEN_NAMES.LESS_EQUAL,
    test: (buffer: string) => buffer.match(/^<=/),
    consumeFrom: (buffer: string): string => buffer.match(/^<=/)![0],
  },
  {
    name: TOKEN_NAMES.LESS,
    test: (buffer: string) => buffer.match(/^</),
    consumeFrom: (buffer: string): string => buffer.match(/^</)![0],
  },
];

export type Token = {
  name: string;
};

export type Tokens = Token[];

function assertTokenType(tokenType: unknown): asserts tokenType is TokenType {
  if (!tokenType) {
    throw new Error("Value wasn't a tokenType: " + tokenType);
  }
}

// TODO: 
// - Add literal lexeme
// - Add line number
// { name, literal/lexeme, lineNumber, position
export async function scan(readLine: ReadLine) {
  const tokens: Tokens = [];
  let line = await readLine();
  let currentBuffer = line.trim();

  while (currentBuffer !== '') {
    const tokenType = tokenTypes.find((tokenType) =>
      tokenType.test(currentBuffer),
    );
    assertTokenType(tokenType);
    //"!"
    const lexeme = tokenType.consumeFrom(currentBuffer);
    currentBuffer = currentBuffer.slice(lexeme.length).trimStart();
    tokens.push({ name: tokenType.name });
  }

  return { tokens };
}
