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

const tokenTypes = [
  {
    name: TOKEN_NAMES.EQUAL_EQUAL,
    test: (buffer: string) => buffer.match(/^==/),
    consumeFrom: (buffer: string) => buffer.match(/^==/)![0],
  },
  {
    name: TOKEN_NAMES.BANG_EQUAL,
    test: (buffer: string) => buffer.match(/^!=/),
    consumeFrom: (buffer: string) => buffer.match(/^!=/)![0],
  },
  {
    name: TOKEN_NAMES.LEFT_PAREN,
    test: (buffer: string) => buffer.match(/^\(/),
    consumeFrom: (buffer: string) => buffer.match(/^\(/)![0],
  },
  {
    name: TOKEN_NAMES.RIGHT_PAREN,
    test: (buffer: string) => buffer.match(/^\)/),
    consumeFrom: (buffer: string) => buffer.match(/^\)/)![0],
  },
  {
    name: TOKEN_NAMES.BANG,
    test: (buffer: string) => buffer.match(/^\!/),
    consumeFrom: (buffer: string) => buffer.match(/^\!/)![0],
  },
  // TODO: consider if word boundary needed
  {
    name: TOKEN_NAMES.TRUE,
    test: (buffer: string) => buffer.match(/^true\b/),
    consumeFrom: (buffer: string) => buffer.match(/^true\b/)![0],
  },
  {
    name: TOKEN_NAMES.FALSE,
    test: (buffer: string) => buffer.match(/^false\b/),
    consumeFrom: (buffer: string) => buffer.match(/^false\b/)![0],
  },
];

type ScanParams = {
  // readline: () => string,
  readLine: () => Promise<string>;
  buffer: string;
  tokens: [];
  line: number;
};

// TODO: see if I can get away with this
const defaultScanArguments = {
  readLine: async () => Promise.resolve(''),
  buffer: ' ',
  tokens: [],
  line: 0,
};

export async function scan({ readLine }) {
  const tokens = [];
  let line = await readLine();
  let currentBuffer = line.trim();

  while (currentBuffer !== '') {
    const tokenType = tokenTypes.find((tokenType) => tokenType.test(currentBuffer));
    const lexeme = tokenType.consumeFrom(currentBuffer)
    currentBuffer = currentBuffer.slice([lexeme.length]).trimStart();
    tokens.push({ name: tokenType.name });
  }

  return { tokens };
}


// export type TokenType = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES];

// type Token = {
//   type: TokenType;
//   line: number;
//   lexeme: string;
//   // literal: Object, // TN: come back to
// };

