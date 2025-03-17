import {
  NodeBuilderParams,
  NodeBuilderResult,
  buildTerm,
  Environment,
} from '.';
import { CompilerError } from '../errors';
import { TOKEN_NAMES } from '../scanner';
import { matches, peek } from './helpers';

export function buildComparison({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterTermBuilt } = buildTerm({
    tokens,
    currentTokenHead,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterTermBuilt }),
      TOKEN_NAMES.GREATER_EQUAL,
      TOKEN_NAMES.GREATER,
      TOKEN_NAMES.LESS_EQUAL,
      TOKEN_NAMES.LESS,
    )
  ) {
    const token = tokens[tokenHeadAfterTermBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildTerm({
        tokens,
        currentTokenHead: tokenHeadAfterTermBuilt + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        const leftExpr = this.left.evaluate(environment);
        const rightExpr = this.right.evaluate(environment);
        switch (this.token.name) {
          case TOKEN_NAMES.GREATER_EQUAL:
            return leftExpr >= rightExpr;
          case TOKEN_NAMES.GREATER:
            return leftExpr > rightExpr;
          case TOKEN_NAMES.LESS_EQUAL:
            return leftExpr <= rightExpr;
          case TOKEN_NAMES.LESS:
            return leftExpr < rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse comparison: ${leftExpr}, ${token.text}, ${rightExpr}`,
              lineNumber: token.lineNumber,
            });
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightBuilt,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterTermBuilt,
  };
}
