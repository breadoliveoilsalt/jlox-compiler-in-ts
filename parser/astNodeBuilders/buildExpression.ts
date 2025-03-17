import { NodeBuilderParams, NodeBuilderResult, buildAssignment } from '.';

export function buildExpression({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  return buildAssignment({ tokens, currentTokenHead });
}
