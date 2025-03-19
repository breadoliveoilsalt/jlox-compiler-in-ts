import { TOKEN_NAMES } from '..';

export type TokenName = (typeof TOKEN_NAMES)[keyof typeof TOKEN_NAMES];

export type Token = {
  name: string;
  text: string;
  lineNumber: number;
};

export type Tokens = Token[];
