import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { envHelpers } from '../helpers';

export function buildIdentifier({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { get } = envHelpers();
  const token = tokens[currentTokenHead];
  const identifierName = token.text;

  // TODO: re-consider where this should be
  // I think in `evaluate`, I need to `get`, but if there is nothing, then throw
  // if (!has(environment, identifierName)) {
  //   throw new CompilerError({
  //     name: 'JloxSyntaxError',
  //     message: `Undefined variable (identifier): "${token.text}"`,
  //     lineNumber: token.lineNumber,
  //   });
  // }
  const node = {
    token,
    evaluate(environment: Environment) {
      return get(environment, identifierName) ?? 'nil';
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
  };
}
