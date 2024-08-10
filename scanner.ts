import type { CreateReadStreamOptions } from 'node:fs/promises';

const tokenTypes = [
  {
    name: 'leftParen',
    test: (buffer: string) => buffer.match(/^\(/),
  },
  {
    name: 'rightParen',
    test: (buffer: string) => buffer.match(/^\)/),
    // extract: (readline, currentBuffer) => // fill in : return token and updated buffer
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
  readLine: async () => Promise.resolve(' '),
  buffer: '',
  tokens: [],
  line: 0,
};

export async function scan(
  { readLine, buffer, tokens, line }: ScanParams = {
    readLine: async () => Promise.resolve(' '),
    buffer: '',
    tokens: [],
    line: 0,
  },
) {

  console.log(await readLine())
  console.log(await readLine())

  // UP TO HERE
  // const currentBuffer = buffer + 

  console.log('done')
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
