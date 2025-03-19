import type { NodeBuilderParams, NodeBuilderResult } from '../types';

export function buildString({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const node = {
    token,
    evaluate() {
      return token.text;
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
  };
}
