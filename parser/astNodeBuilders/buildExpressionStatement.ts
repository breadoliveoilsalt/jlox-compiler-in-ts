import { buildExpression } from './buildExpression';
import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { matches, peek } from '../helpers';

export function buildExpressionStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const { node: expression, currentTokenHead: tokenHeadAfterExpressionBuilt } =
    buildExpression({ tokens, currentTokenHead });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionBuilt }),
      TOKEN_NAMES.SEMICOLON,
    )
  ) {
    const node = {
      token,
      evaluate(environment: Environment) {
        return expression.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
    };
  }

  throw new CompilerError({
    name: 'JloxSynatxError',
    message: 'Missing semicolon ";" after expression',
    lineNumber: token.lineNumber,
  });
}
