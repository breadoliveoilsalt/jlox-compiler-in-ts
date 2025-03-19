import { buildEquality } from './buildEquality';
import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { TOKEN_NAMES } from '../../scanner';
import { matches } from '../helpers';

export function buildAnd({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: leftNode, currentTokenHead: tokenHeadAfterEqualityBuiltLeft } =
    buildEquality({
      tokens,
      currentTokenHead,
    });

  const currentToken = tokens[tokenHeadAfterEqualityBuiltLeft];

  if (matches(currentToken, TOKEN_NAMES.AND)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityBuiltRight,
    } = buildAnd({
      tokens,
      currentTokenHead: tokenHeadAfterEqualityBuiltLeft + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterEqualityBuiltLeft],
      evaluate(environment: Environment) {
        const left = leftNode.evaluate(environment);
        if (!left) return left;
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
    currentTokenHead: tokenHeadAfterEqualityBuiltLeft,
  };
}
