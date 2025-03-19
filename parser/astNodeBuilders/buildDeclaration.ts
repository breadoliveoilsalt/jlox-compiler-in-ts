import { buildFunction } from './buildFunction';
import { buildVar } from './buildVar';
import { buildStatement } from './buildStatement';
import { NodeBuilderParams, NodeBuilderResult } from '../types';
import { TOKEN_NAMES } from '../../scanner';
import { matches } from '../helpers';

export function buildDeclaration({
  tokens,
  currentTokenHead = 0,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.FUN)) {
    return buildFunction({ tokens, currentTokenHead });
  }

  if (matches(token, TOKEN_NAMES.VAR)) {
    return buildVar({ tokens, currentTokenHead });
  }

  return buildStatement({ tokens, currentTokenHead });
}
