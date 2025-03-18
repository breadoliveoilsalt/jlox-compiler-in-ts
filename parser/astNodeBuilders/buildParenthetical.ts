import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { buildExpression } from './buildExpression';
import { matches, peek } from '../helpers';

export function buildParenthetical({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: expressionNode,
    currentTokenHead: tokenHeadAfterExpressionBuilt,
  } = buildExpression({
    tokens,
    currentTokenHead: currentTokenHead + 1,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionBuilt }),
      TOKEN_NAMES.RIGHT_PAREN,
    )
  ) {
    const token = tokens[tokenHeadAfterExpressionBuilt];

    const node = {
      token,
      evaluate(environment: Environment) {
        return expressionNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
    };
  }

  throw new CompilerError({
    name: 'JloxSyntaxError',
    message:
      'Something went wrong evaluating a parenthetical. Is there a missing closing parentheses ")"?',
    lineNumber: tokens[tokenHeadAfterExpressionBuilt].lineNumber,
  });
}
