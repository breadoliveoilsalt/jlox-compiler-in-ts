import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { buildUnary } from './buildUnary';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { matches, peek } from '../helpers';

export function buildFactor({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterUnaryBuilt } = buildUnary(
    {
      tokens,
      currentTokenHead,
    },
  );

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterUnaryBuilt }),
      TOKEN_NAMES.SLASH,
      TOKEN_NAMES.STAR,
    )
  ) {
    const token = tokens[tokenHeadAfterUnaryBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildUnary({
        tokens,
        currentTokenHead: tokenHeadAfterUnaryBuilt + 1,
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
          case TOKEN_NAMES.SLASH:
            return leftExpr / rightExpr;
          case TOKEN_NAMES.STAR:
            return leftExpr * rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse factor: ${leftExpr}, ${token.text}, ${rightExpr}`,
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
    currentTokenHead: tokenHeadAfterUnaryBuilt,
  };
}
