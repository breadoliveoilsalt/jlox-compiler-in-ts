import { NodeBuilderParams, NodeBuilderResult, buildOr, Environment } from '.';
import { CompilerError } from '../errors';
import { TOKEN_NAMES } from '../scanner';
import { matches } from './helpers';

export function buildAssignment({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: nodeFromOrBuild, currentTokenHead: tokenHeadAfterOrBuild } =
    buildOr({
      tokens,
      currentTokenHead,
    });

  if (matches(tokens[tokenHeadAfterOrBuild], TOKEN_NAMES.EQUAL)) {
    const {
      node: nodeFromRecursiveAssignmentBuilt,
      currentTokenHead: tokenHeadAfterAssignmentBuilt,
    } = buildAssignment({
      tokens,
      currentTokenHead: tokenHeadAfterOrBuild + 1,
    });

    const assignmentToken = tokens[tokenHeadAfterAssignmentBuilt];

    if (nodeFromOrBuild.token.name === TOKEN_NAMES.IDENTIFIER) {
      const node = {
        token: assignmentToken,
        evaluate(environment: Environment) {
          const key = nodeFromOrBuild.token.text;
          const value = nodeFromRecursiveAssignmentBuilt.evaluate(environment);
          update(environment, key, value);
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterAssignmentBuilt,
      };
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Invalid assignment to variable (identifier)',
      lineNumber: assignmentToken.lineNumber,
    });
  }

  return {
    node: nodeFromOrBuild,
    currentTokenHead: tokenHeadAfterOrBuild,
  };
}
