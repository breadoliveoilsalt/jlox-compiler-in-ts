import type {
  NodeBuilderParams,
  NodeBuilderResult,
  PrimaryBuilders,
} from '../types';
import { buildTrue } from './buildTrue';
import { buildFalse } from './buildFalse';
import { buildParenthetical } from './buildParenthetical';
import { buildNumber } from './buildNumber';
import { buildString } from './buildString';
import { buildIdentifier } from './buildIdentifier';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';

export function buildPrimary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  const primaryBuilders: PrimaryBuilders = {
    [TOKEN_NAMES.TRUE]: buildTrue,
    [TOKEN_NAMES.FALSE]: buildFalse,
    [TOKEN_NAMES.LEFT_PAREN]: buildParenthetical,
    [TOKEN_NAMES.NUMBER]: buildNumber,
    [TOKEN_NAMES.STRING]: buildString,
    [TOKEN_NAMES.IDENTIFIER]: buildIdentifier,
  };

  if (primaryBuilders[currentToken.name]) {
    const build = primaryBuilders[currentToken.name];
    const { node, currentTokenHead: tokenHeadAfterPrimaryBuilt } = build({
      tokens,
      currentTokenHead,
    });

    return {
      node,
      currentTokenHead: tokenHeadAfterPrimaryBuilt,
    };
  }

  throw new CompilerError({
    name: 'JloxSyntaxError',
    message: `Unrecognized primary lexeme: "${currentToken.text}"`,
    lineNumber: currentToken.lineNumber,
  });
}
