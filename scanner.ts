import { type ReadLine } from './index';
import { CompilerError, GrammarError } from './errors';

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
const matchSemicolon = (buffer: string) => buffer.match(/^;/);
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
const matchPrint = (buffer: string) => buffer.match(/^print\b/)

function buildConsumer(matcher: (buffer: string) => RegExpMatchArray | null): (buffer: string) => string {
  return (buffer: string) => {
    if (typeof buffer === 'string') {
      // TODO: Add typecheck here to avoid ! assertion
      return matcher(buffer)![0]
    }
    throw new GrammarError({
      name: 'GrammarError',
      message: `Error string not passed to token consumer. This was passed instead: ${buffer}`,
    })
  }
}

// TODO: Refactor all consumeFroms below to use buildConsumer
const tokenTypes: TokenType[] = [
  {
    name: TOKEN_NAMES.LEFT_PAREN,
    test: matchLeftParen,
    consumeFrom: buildConsumer(matchLeftParen),
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
    name: TOKEN_NAMES.SEMICOLON,
    test: matchSemicolon,
    consumeFrom: buildConsumer(matchSemicolon),
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
    consumeFrom: buildConsumer(matchNumber),
  },
  {
    name: TOKEN_NAMES.PRINT,
    test: matchPrint,
    consumeFrom: buildConsumer(matchPrint),
  },
];

export type Token = {
  name: string;
  text: string;
  lineNumber: number;
};

export type Tokens = Token[];

function assertTokenType(tokenType: unknown, currentLine: string, lineNumber: number): asserts tokenType is TokenType {
  if (!tokenType) {
    throw new CompilerError({
      name: 'TokenError',
      message: `Unrecognized token: "${currentLine}"`,
      lineNumber,
    })
  }
}

export async function scan(readLine: ReadLine) {
  const tokens: Tokens = [];
  let buffer = await readLine();
  let lineNumber = 0;

  // NOTE: scanner determines the end via `readLine`'s end
  // signifier -- false. Meanwhile, parser will determine end
  // via the EOF token added below.
  while (buffer !== false) {
    lineNumber = lineNumber + 1;

    let currentLine = buffer.trim();

    while (currentLine !== '') {
      const tokenType = tokenTypes.find((tokenType) =>
        tokenType.test(currentLine),
      );
      assertTokenType(tokenType, currentLine, lineNumber);
      const lexeme = tokenType.consumeFrom(currentLine);
      currentLine = currentLine.slice(lexeme.length).trimStart();
      tokens.push({ name: tokenType.name, text: lexeme, lineNumber });
    }

    buffer = await readLine();
  }

  tokens.push({ name: TOKEN_NAMES.EOF, text: '', lineNumber })

  return { tokens };
}
