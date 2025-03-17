import {
  NodeBuilderParams,
  NodeBuilderResult,
  buildComparison,
  Environment,
} from '.';
import { TOKEN_NAMES } from '../scanner';
import { matches, peek } from './helpers';

export function buildEquality({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterComparisonBuilt } =
    buildComparison({
      tokens,
      currentTokenHead,
    });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterComparisonBuilt }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const token = tokens[tokenHeadAfterComparisonBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildComparison({
        tokens,
        currentTokenHead: tokenHeadAfterComparisonBuilt + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        if (this.token.name === TOKEN_NAMES.EQUAL_EQUAL)
          return (
            !!this.left &&
            this.left?.evaluate(environment) ===
              this.right?.evaluate(environment)
          );
        if (this.token.name === TOKEN_NAMES.BANG_EQUAL)
          return (
            this.left!! &&
            this.left?.evaluate(environment) !==
              this.right?.evaluate(environment)
          );
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightBuilt,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterComparisonBuilt,
  };
}
