import { type AstTree } from '../types';
import { type Tokens } from '../../scanner/types';
import { TOKEN_NAMES } from '../../scanner';
import { buildDeclaration } from './buildDeclaration';

export function buildBlock({
  tokens,
  currentTokenHead,
  statements = [],
}: {
  tokens: Tokens;
  currentTokenHead: number;
  statements?: Array<AstTree>;
}) {
  const currentTokenName = tokens[currentTokenHead].name;

  if (
    currentTokenName === TOKEN_NAMES.RIGHT_BRACE ||
    currentTokenName === TOKEN_NAMES.EOF
  )
    return {
      currentTokenHead:
        currentTokenName === TOKEN_NAMES.EOF
          ? currentTokenHead
          : currentTokenHead + 1,
      statements,
    };

  const { node, currentTokenHead: tokenHeadAfterExpressionBuilt } =
    buildDeclaration({
      tokens,
      currentTokenHead,
    });

  const updatedStatements = [...statements, node];

  return buildBlock({
    tokens,
    currentTokenHead: tokenHeadAfterExpressionBuilt,
    statements: updatedStatements,
  });
}
