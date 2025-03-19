import { buildExpression } from './buildExpression';
import { buildPrimary } from './buildPrimary';
import {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
  AstTree,
} from '../types';
import { CompilerError, RuntimeError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { matches } from '../helpers';

export type ArgumentsResult = {
  argumentNodes: Array<AstTree>;
  currentTokenHead: number;
};

function buildArguments({
  tokens,
  currentTokenHead,
  argumentNodes,
}: NodeBuilderParams & {
  argumentNodes: ArgumentsResult['argumentNodes'];
}): ArgumentsResult {
  if (matches(tokens[currentTokenHead], TOKEN_NAMES.RIGHT_PAREN)) {
    return {
      argumentNodes,
      currentTokenHead,
    };
  }

  const argumentHead = matches(tokens[currentTokenHead], TOKEN_NAMES.COMMA)
    ? currentTokenHead + 1
    : currentTokenHead;

  // TODO: I like this naming convention here: intent (Argument) + builder (Expression)
  const {
    node: argumentExpressionNode,
    currentTokenHead: tokenHeadAfterArgumentExpressionBuilt,
  } = buildExpression({
    tokens,
    currentTokenHead: argumentHead,
  });

  return buildArguments({
    tokens,
    currentTokenHead: tokenHeadAfterArgumentExpressionBuilt,
    argumentNodes: [...argumentNodes, argumentExpressionNode],
  });
}

export function buildCall({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: primaryNode, currentTokenHead: tokenHeadAfterPrimaryBuilt } =
    buildPrimary({
      tokens,
      currentTokenHead: currentTokenHead,
    });

  if (matches(tokens[tokenHeadAfterPrimaryBuilt], TOKEN_NAMES.LEFT_PAREN)) {
    const { argumentNodes, currentTokenHead: tokenHeadAfterArgumentsBuilt } =
      buildArguments({
        tokens,
        currentTokenHead: tokenHeadAfterPrimaryBuilt + 1,
        argumentNodes: [],
      });

    if (
      !matches(tokens[tokenHeadAfterArgumentsBuilt], TOKEN_NAMES.RIGHT_PAREN)
    ) {
      throw new CompilerError({
        name: 'JloxSyntaxError',
        message: 'Expect ) after function call',
        lineNumber: tokens[tokenHeadAfterArgumentsBuilt].lineNumber,
      });
    }

    // NOTE: If you wanted to limit the number of allowed arguments, here is where
    // you add check, say, that argumentNodes.length < 255
    const node = {
      token: tokens[tokenHeadAfterArgumentsBuilt],
      argumentNodes,
      calleeNode: primaryNode,
      evaluate(environment: Environment) {
        const callee = primaryNode.evaluate(environment);
        if (!Object.hasOwn(callee, 'call')) {
          throw new RuntimeError({
            name: 'RuntimeError',
            message:
              'There is an attempt to call something that is not a function',
            lineNumber: tokens[tokenHeadAfterArgumentsBuilt].lineNumber,
          });
        }

        const evaluatedArguments = this.argumentNodes.map((argument) =>
          argument.evaluate(environment),
        );

        if (evaluatedArguments.length !== callee.arity()) {
          throw new RuntimeError({
            name: 'RuntimeError',
            message:
              "Arguments passed to function do not match function's arity",
            lineNumber: tokens[tokenHeadAfterArgumentsBuilt].lineNumber,
          });
        }

        return callee.call(evaluatedArguments);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterArgumentsBuilt + 1,
    };
  }

  return {
    node: primaryNode,
    currentTokenHead: tokenHeadAfterPrimaryBuilt,
  };
}
