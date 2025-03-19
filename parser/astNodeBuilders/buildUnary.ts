import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { buildCall } from './buildCall';
import { TOKEN_NAMES } from '../../scanner';
import { matches } from '../helpers';

export function buildUnary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  if (matches(currentToken, TOKEN_NAMES.BANG, TOKEN_NAMES.MINUS)) {
    const { node: right, currentTokenHead: tokenHeadAfterUnaryBuilt } =
      buildUnary({
        tokens,
        currentTokenHead: currentTokenHead + 1,
      });

    const node = {
      token: currentToken,
      right,
      evaluate(environment: Environment) {
        const right = this.right.evaluate(environment);
        if (this.token.name === TOKEN_NAMES.BANG) return !right;
        // NOTE: Below checks for number type to prevent
        // javascript oddities like `14 -true`, which evaluates to 13
        if (this.token.name === TOKEN_NAMES.MINUS && typeof right === 'number')
          return -right;
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterUnaryBuilt,
    };
  }

  return buildCall({ tokens, currentTokenHead });
}
