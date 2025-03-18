import { TOKEN_NAMES } from '../scanner';
import { type Tokens } from '../scanner/types';
import { type AstTree } from './types';
import { buildDeclaration } from './astNodeBuilders/buildDeclaration';

export function parse({
  tokens,
  currentTokenHead = 0,
  statements = [],
}: {
  tokens: Tokens;
  currentTokenHead?: number;
  statements?: Array<AstTree>;
}) {
  if (tokens[currentTokenHead].name === TOKEN_NAMES.EOF) {
    return {
      statements,
    };
  }

  const { node, currentTokenHead: tokenHeadAfterExpressionBuilt } =
    buildDeclaration({
      tokens,
      currentTokenHead,
    });

  const updatedStatements = [...statements, node];

  return parse({
    tokens,
    currentTokenHead: tokenHeadAfterExpressionBuilt,
    statements: updatedStatements,
  });
}
