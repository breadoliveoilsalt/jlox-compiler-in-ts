import { clone } from 'ramda';
import {
  type Token,
  type Tokens,
  type TokenName,
  TOKEN_NAMES,
} from './scanner';
import type { NodeBuilderParams, Environment } from './parser';
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

function allTokensParsed({
  tokens,
  currentTokenHead,
}: Omit<NodeBuilderParams, 'environment'>) {
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
      throw new Error(
        'Developer: You have accidentally added too many expected tokens to assertTokenSequence',
      );
    }

    const mismatch = expectedTokens.find((expected, index: number) => {
      const tokenToTest = tokens[currentTokenHead + index];
      function unexpectedMismatch() {
        return expected.name !== tokenToTest.name && !expected.isNegated;
      }
      function unexpectedMatch() {
        return expected.name === tokenToTest.name && expected.isNegated;
      }

      return unexpectedMismatch() || unexpectedMatch();
    });

    return !mismatch;
  }

  return { assertTokenSequence, not };
}

export function envHelpers() {
  function deepClone(env: Environment): Environment {
    return clone(env);
  }

  function update(env: Environment, key: string, value: any) {
    const envCopy = deepClone(env);

    envCopy[key] = value;
    return envCopy;
  }

  function get(env: Environment, key: string): any {
    if (!env.outterScope) return env[key];
    return env[key] ?? get(env.outterScope, key);
  }

  function has(env: Environment, key: string): boolean {
    if (!env.outterScope) return Object.hasOwn(env, key);
    return Object.hasOwn(env, key) || has(env.outterScope, key);
  }

  return {
    update,
    get,
    has,
  };
}
