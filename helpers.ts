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

type NegatedToken = Token & { negate: true };

export function not(token: Token): NegatedToken {
  return { ...token, negate: true };
}


type NegatedToken = {
  name: TokenName;
  negate: true;
}

export function not(name: TokenName): NegatedToken {
  return ({
    name,
    negate: true,
  })
}

export function sequencer(data: (TokenName | NegatedToken[]) {

}


function assertTokenSequence({
  tokens,
  currentTokenHead,
  expectedTokenSequence,
}: {
  tokens: Tokens;
  currentTokenHead: number;
  expectedTokenSequence: { name: TokenName, negated?: true};
}): boolean {
  expectedTokenSequence.forEach((expected, index: number) => {
    // UPTO: fix ts error below; write tests for this funciton
    // REM that the negate property will be on the names, not the
    // tokens. I see the problem now
    // Idea: make the signature like this

    // assertTokenSequence({ tokens, currentTokenHead, expected: sequence(TOKEN_NAME.TRUE, not(TOKEN_NAME.SEMICOLON))}
    // the squence method will turn each into an object with a `name` and optional `negated` property. Not will turn it into an object
    // like that automatically. So sequence will need to check if it's gettingn an object or a string and create objects accordingly

    const tokenToTest = tokens[currentTokenHead + index];
    function namesMatch() {
      return expected.name === tokenToTest.name;
    }
    if (expected.negate && namesMatch()) return false;
    if (!namesMatch()) return false;
  });

  return true;
}
