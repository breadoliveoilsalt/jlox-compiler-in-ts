import { buildAnd } from './buildAnd';
import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { TOKEN_NAMES } from '../../scanner';
import { matches } from '../helpers';

export function buildOr({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: leftNode, currentTokenHead: tokenHeadAfterAndBuilt } = buildAnd(
    {
      tokens,
      currentTokenHead,
    },
  );

  const currentToken = tokens[tokenHeadAfterAndBuilt];

  if (matches(currentToken, TOKEN_NAMES.OR)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityBuiltRight,
    } = buildOr({
      tokens,
      currentTokenHead: tokenHeadAfterAndBuilt + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterAndBuilt],
      evaluate(environment: Environment) {
        const left = leftNode.evaluate(environment);
        if (!!left) return left;
        return rightNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterEqualityBuiltRight,
    };
  }

  return {
    node: leftNode,
    currentTokenHead: tokenHeadAfterAndBuilt,
  };
}
