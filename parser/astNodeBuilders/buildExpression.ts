import { buildAssignment } from './buildAssignment';
import type { NodeBuilderParams, NodeBuilderResult } from '../types';

export function buildExpression({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  return buildAssignment({ tokens, currentTokenHead });
}
