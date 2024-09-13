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

const matchLeftParen = (buffer: string) => buffer.match(/^\(/)
const matchRightParen = (buffer: string) => buffer.match(/^\)/)
const matchMinus = (buffer: string) => buffer.match(/^-/)
const matchPlus = (buffer: string) => buffer.match(/^\+/)
const matchSlash = (buffer: string) => buffer.match(/^\//)
const matchStar = (buffer: string) => buffer.match(/^\*/)
const matchBangEqual = (buffer: string) => buffer.match(/^!=/)
const matchBang = (buffer: string) => buffer.match(/^\!/)
const matchGreaterEqual = (buffer: string) => buffer.match(/^>=/)
const matchGreater = (buffer: string) => buffer.match(/^>/)
const matchLessEqual = (buffer: string) => buffer.match(/^<=/)
const matchLess = (buffer: string) => buffer.match(/^</)
const matchEqualEqual = (buffer: string) => buffer.match(/^==/)
const matchTrue = (buffer: string) => buffer.match(/^true\b/)
const matchFalse = (buffer: string) => buffer.match(/^false\b/)
const matchNumber = (buffer: string) => buffer.match(/^[+-]?[0-9]+(\.[0-9]+)?/)

const tokenTypes: TokenType[] = [
  {
    name: TOKEN_NAMES.LEFT_PAREN,
    test: matchLeftParen,
    consumeFrom: (buffer: string): string => matchLeftParen(buffer)![0],
  },
  {
    name: TOKEN_NAMES.RIGHT_PAREN,
    test: matchRightParen,
    consumeFrom: (buffer: string): string => matchRightParen(buffer)![0],
  },
  // NOTE: By not requiring a word boundary after the `-` token, the following
  // is valid, unlike in JavaScript:
  // -15--5
  {
    name: TOKEN_NAMES.MINUS,
    test: matchMinus,
    consumeFrom: (buffer: string): string => matchMinus(buffer)![0],
  },
  {
    name: TOKEN_NAMES.PLUS,
    test: matchPlus,
    consumeFrom: (buffer: string): string => matchPlus(buffer)![0],
  },
  {
    name: TOKEN_NAMES.SLASH,
    test: matchSlash,
    consumeFrom: (buffer: string): string => matchSlash(buffer)![0],
  },
  {
    name: TOKEN_NAMES.STAR,
    test: matchStar,
    consumeFrom: (buffer: string): string => matchStar(buffer)![0],
  },
  // NOTE: BANG_EQUAL has to come before EQUAL to avoid
  // false-positive with BANG regex. Many others below.
  {
    name: TOKEN_NAMES.BANG_EQUAL,
    test: matchBangEqual,
    consumeFrom: (buffer: string): string => matchBangEqual(buffer)![0],
  },
  {
    name: TOKEN_NAMES.BANG,
    test: matchBang,
    consumeFrom: (buffer: string): string => matchBang(buffer)![0],
  },
  {
    name: TOKEN_NAMES.GREATER_EQUAL,
    test: matchGreaterEqual,
    consumeFrom: (buffer: string): string => matchGreaterEqual(buffer)![0],
  },
  {
    name: TOKEN_NAMES.GREATER,
    test: matchGreater,
    consumeFrom: (buffer: string): string => matchGreater(buffer)![0],
  },
  {
    name: TOKEN_NAMES.LESS_EQUAL,
    test: matchLessEqual,
    consumeFrom: (buffer: string): string => matchLessEqual(buffer)![0],
  },
  {
    name: TOKEN_NAMES.LESS,
    test: matchLess,
    consumeFrom: (buffer: string): string => matchLess(buffer)![0],
  },
  {
    name: TOKEN_NAMES.EQUAL_EQUAL,
    test: matchEqualEqual,
    consumeFrom: (buffer: string): string => matchEqualEqual(buffer)![0],
  },
  {
    name: TOKEN_NAMES.TRUE,
    test: matchTrue,
    consumeFrom: (buffer: string): string => matchTrue(buffer)![0],
  },
  {
    name: TOKEN_NAMES.FALSE,
    test: matchFalse,
    consumeFrom: (buffer: string): string => matchFalse(buffer)![0],
  },
  // NOTE: I'm removing word boundary from numbers and
  // comparisons and operators, so 343>343 is valid.
  {
    name: TOKEN_NAMES.NUMBER,
    test: matchNumber,
    consumeFrom: (buffer: string): string => matchNumber(buffer)![0],
  },
];

export type Token = {
  name: string;
  text: string,
};

export type Tokens = Token[];

function assertTokenType(tokenType: unknown, currentBuffer: string): asserts tokenType is TokenType {
  if (!tokenType) {
    throw new Error("Value wasn't a tokenType: " + currentBuffer);
  }
}

// TODO:
// - Add line number
// { name, literal/lexeme, lineNumber, cursorPosition }
export async function scan(readLine: ReadLine) {
  const tokens: Tokens = [];
  let line = await readLine();
  let currentBuffer = line.trim();

  while (currentBuffer !== '') {
    const tokenType = tokenTypes.find((tokenType) =>
      tokenType.test(currentBuffer),
    );
    assertTokenType(tokenType, currentBuffer);
    const lexeme = tokenType.consumeFrom(currentBuffer);
    currentBuffer = currentBuffer.slice(lexeme.length).trimStart();
    tokens.push({ name: tokenType.name, text: lexeme });
  }

  return { tokens };
}
