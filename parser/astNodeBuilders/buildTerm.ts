import { buildFactor } from './buildFactor';
import { NodeBuilderParams, NodeBuilderResult, Environment } from '../types';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { matches, peek } from '../helpers';

export function buildTerm({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterFactorBuilt } =
    buildFactor({
      tokens,
      currentTokenHead,
    });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterFactorBuilt }),
      TOKEN_NAMES.MINUS,
      TOKEN_NAMES.PLUS,
    )
  ) {
    const token = tokens[tokenHeadAfterFactorBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildFactor({
        tokens,
        currentTokenHead: tokenHeadAfterFactorBuilt + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        const leftExpr = this.left.evaluate(environment);
        const rightExpr = this.right.evaluate(environment);
        if (leftExpr === 'nil' || rightExpr === 'nil') {
          throw new CompilerError({
            name: 'JloxSyntaxError',
            message: `Cannot evaluate ${token.text} with a nil value: ${leftExpr} ${token.text} ${rightExpr}.`,
            lineNumber: token.lineNumber,
          });
        }
        switch (this.token.name) {
          case TOKEN_NAMES.MINUS:
            return leftExpr - rightExpr;
          case TOKEN_NAMES.PLUS:
            return leftExpr + rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse term: ${leftExpr}, ${token.text}, ${rightExpr}`,
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
    currentTokenHead: tokenHeadAfterFactorBuilt,
  };
}
