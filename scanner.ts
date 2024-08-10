const tokenTypes = [
  {
    name: 'leftParen',
    test: (buffer: string) => buffer.match(/^\(/),
    consumeFrom: (buffer: string) => buffer.match(/^\(/)![0],
  },
  {
    name: 'rightParen',
    test: (buffer: string) => buffer.match(/^\)/),
    consumeFrom: (buffer: string) => buffer.match(/^\)/)![0],
  },
  {
    name: 'bang',
    test: (buffer: string) => buffer.match(/^\!/),
    consumeFrom: (buffer: string) => buffer.match(/^\!/)![0],
  },
  {
    name: 'true',
    test: (buffer: string) => buffer.match(/^true\b/),
    consumeFrom: (buffer: string) => buffer.match(/^true\b/)![0],
  },
  {
    name: 'bang',
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

export async function scan( { readLine }) {
  const tokens = [];
  let line = await readLine();
  let currentBuffer = line.trim();

  while (currentBuffer !== '') {
    console.log('currentBuffer1', currentBuffer) 
    const tokenType = tokenTypes.find((tokenType) => tokenType.test(currentBuffer));
    const lexeme = tokenType.consumeFrom(currentBuffer)
    console.log('lexeme', lexeme)
    currentBuffer = currentBuffer.slice([lexeme.length])
    console.log('currentBuffer2', currentBuffer) 
    tokens.push({name: tokenType.name});
  }

  console.log(tokens);
  // UP TO HERE
  // PROBLEM: if I supply one property in the object paramenter, I lose all the other defaults
  // const currentBuffer = buffer + currentLine;
  // console.log('currentBuffer', currentBuffer)

  console.log('done');
}

// const TOKEN_NAMES = {
//   LEFT_PAREN: 'leftParen',
//   RIGHT_PAREN: 'rightParen',
//   LEFT_BRACE: 'leftBrace',
//   RIGHT_BRACE: 'rightBrace',
//   COMMA: 'comma',
//   DOT: 'dot',
//   MINUS: 'minus',
//   PLUS: 'plus',
//   SEMICOLON: 'semicolon',
//   SLASH: 'slash',
//   STAR: 'star',
//   BANG: 'bang',
//   BANG_EQUAL: 'bangEqual',
//   EQUAL: 'equal',
//   EQUAL_EQUAL: 'equalEqual',
//   GREATER: 'greater',
//   GREATER_EQUAL: 'greaterEqual',
//   LESS: 'less',
//   LESS_EQUAL: 'lessEqual',
//   IDENTIFIER: 'identifier',
//   STRING: 'string',
//   NUMBER: 'number',
//   AND: 'and',
//   CLASS: 'class',
//   ELSE: 'else',
//   FALSE: 'false',
//   FUN: 'fun',
//   FOR: 'for',
//   IT: 'it',
//   NIL: 'nil',
//   OR: 'or',
//   PRINT: 'print',
//   RETURN: 'return',
//   SUPER: 'super',
//   THIS: 'this',
//   TRUE: 'true',
//   VAR: 'var',
//   WHILE: 'while',
//   EOF: 'eof',
// };

// const TOKEN_REGEXES: Array<[TokenType, RegExp]> = [
//   [TOKEN_NAMES.BANG, new RegExp(/\b!/)],
//   [TOKEN_NAMES.TRUE, new RegExp(/true/)],
//   [TOKEN_NAMES.FALSE, new RegExp(/false/)],
// ];

// export type TokenType = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES];

// type Token = {
//   type: TokenType;
//   line: number;
//   lexeme: string;
//   // literal: Object, // TN: come back to
// };

// let line = 0;

// const tokens: Array<Token> | [] = [];

// export function scan(line: string) {
//   if (line === '') return;
//   TOKEN_REGEXES.forEach(([type, re]) => {
//     const matches = line.match(re);
//     // if (!matches) return;
//     tokens.push({
//       type,
//       line,
//       lexeme: matches[0],
//     });
//   });
// }

// export function getTokens() {
//   return tokens;
// }
