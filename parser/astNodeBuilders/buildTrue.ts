import type { NodeBuilderParams, NodeBuilderResult } from '../types';

export function buildTrue({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];
  const node = {
    token,
    evaluate() {
      return true;
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
  };
}
