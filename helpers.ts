import {
  type Token,
  type Tokens,
  type TokenNames,
  TOKEN_NAMES,
} from './scanner';
import type { NodeBuilderParams } from './parser';
import { CompilerError } from './errors';

export function matches(token: Token | undefined, ...tokenNames: string[]) {
  if (!token) return undefined;
  if (tokenNames.length === 0) {
    throw new CompilerError({
      name: 'DeveloperError',
      message: 'matches function requires at least one tokenName',
      lineNumber: token.lineNumber,
    });
  }
  return tokenNames.find((tokenName) => token?.name === tokenName);
}

function allTokensParsed({ tokens, currentTokenHead }: NodeBuilderParams) {
  return tokens[currentTokenHead].name === TOKEN_NAMES.EOF;
}

export function peek({
  tokens,
  currentTokenHead,
  offset = 0,
}: {
  tokens: Tokens;
  currentTokenHead: number;
  offset?: number;
}): Token | undefined {
  if (allTokensParsed({ tokens, currentTokenHead })) return;
  return tokens[currentTokenHead + offset];
}

type NegatedToken = Token & { negate: true };

export function not(token: Token): NegatedToken {
  return { ...token, negate: true };
}

export function assertTokenSequence({
  tokens,
  currentTokenHead,
  expectedTokenSequence,
}: {
  tokens: Tokens | NegatedToken[];
  currentTokenHead: number;
  expectedTokenSequence: TokenNames[];
}): boolean {
  expectedTokenSequence.forEach((expectedName, index) => {
    // UPTO: fix ts error below; write tests for this funciton
    const tokenToTest = tokens[currentTokenHead + index]
    function namesMatch() {
      return expectedName === tokenToTest.name
    }
    if (tokenToTest.negate && namesMatch()) return false
    if (!namesMatch()) return false;
  })

  return true;
}
