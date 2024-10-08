import {
  type Token,
  type Tokens,
  type TokenName,
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

export function sequencer() {
  function not({ name }: { name: TokenName }) {
    return {
      name,
      isNegated: true,
    };
  }

  function assertTokenSequence({
    tokens,
    currentTokenHead,
    expectedTokens,
  }: {
    tokens: Tokens;
    currentTokenHead: number;
    expectedTokens: { name: TokenName; isNegated?: boolean }[];
  }): boolean {
    if (currentTokenHead + expectedTokens.length > tokens.length) {
      throw new Error ('Developer: You have accidentally added too many expected tokens to assertTokenSequence')
    }

    expectedTokens.forEach((expected, index: number) => {
      const tokenToTest = tokens[currentTokenHead + index];
      console.log({tokenToTest})
      function namesMatch() {
        return expected.name === tokenToTest.name;
      }
      console.log('match?', namesMatch())
      console.log('test 1', expected.isNegated && namesMatch())
      console.log('test 2', !namesMatch())
      if (expected.isNegated && namesMatch()) return false;
      if (!namesMatch()) return false;
    });

    return true;
  }

  return { assertTokenSequence, not };
}
