import { buildIdentifier } from './buildIdentifier';
import { buildBlock } from './buildBlock';
import {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
  AstTree,
} from '../types';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { matches, envHelpers } from '../helpers';

type ParametersResult = {
  parameterNodes: Array<AstTree>;
  currentTokenHead: number;
};

export function buildParameters({
  tokens,
  currentTokenHead,
  parameterNodes,
}: NodeBuilderParams & {
  parameterNodes: ParametersResult['parameterNodes'];
}): ParametersResult {
  if (matches(tokens[currentTokenHead], TOKEN_NAMES.RIGHT_PAREN)) {
    return {
      parameterNodes,
      currentTokenHead,
    };
  }

  const parametersHead = matches(tokens[currentTokenHead], TOKEN_NAMES.COMMA)
    ? currentTokenHead + 1
    : currentTokenHead;

  const {
    node: parameterIdentifierNode,
    currentTokenHead: tokenHeadAfterParameterIdentifierBuilt,
  } = buildIdentifier({
    tokens,
    currentTokenHead: parametersHead,
  });

  return buildParameters({
    tokens,
    currentTokenHead: tokenHeadAfterParameterIdentifierBuilt,
    parameterNodes: [...parameterNodes, parameterIdentifierNode],
  });
}

export function buildFunction({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { set } = envHelpers();

  const {
    node: identifierNode,
    currentTokenHead: tokenHeadAfterIdentifierBuilt,
  } = buildIdentifier({
    tokens,
    currentTokenHead: currentTokenHead + 1,
  });

  if (!matches(tokens[tokenHeadAfterIdentifierBuilt], TOKEN_NAMES.LEFT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect ( after declaring a function name',
      lineNumber: tokens[tokenHeadAfterIdentifierBuilt].lineNumber,
    });
  }

  const { parameterNodes, currentTokenHead: tokenHeadAfterParametersBuilt } =
    buildParameters({
      tokens,
      currentTokenHead: tokenHeadAfterIdentifierBuilt + 1,
      parameterNodes: [],
    });

  if (
    !matches(tokens[tokenHeadAfterParametersBuilt], TOKEN_NAMES.RIGHT_PAREN)
  ) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect ) after declaring parameters in a function',
      lineNumber: tokens[tokenHeadAfterParametersBuilt].lineNumber,
    });
  }

  // NOTE: Here is another place where you can throw an error if you
  // wanted to limit the number of allowed parameters. You can check,
  // say, that parameterNodes.length < 255
  if (
    !matches(tokens[tokenHeadAfterParametersBuilt + 1], TOKEN_NAMES.LEFT_BRACE)
  ) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect { before a function body',
      lineNumber: tokens[tokenHeadAfterParametersBuilt].lineNumber,
    });
  }

  const { currentTokenHead: tokenHeadAfterBlockStatementsBuilt, statements } =
    buildBlock({
      tokens,
      currentTokenHead: tokenHeadAfterParametersBuilt + 2,
    });

  if (
    !matches(
      tokens[tokenHeadAfterBlockStatementsBuilt - 1],
      TOKEN_NAMES.RIGHT_BRACE,
    )
  ) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect } after a function body',
      lineNumber: tokens[tokenHeadAfterParametersBuilt].lineNumber,
    });
  }

  const node = {
    token: tokens[tokenHeadAfterBlockStatementsBuilt],
    evaluate(environment: Environment) {
      const functionObject = {
        parameters: parameterNodes,
        arity() {
          return parameterNodes.length;
        },
        call(args: AstTree[]) {
          const newEnv = { outerScope: environment };
          parameterNodes.forEach((param, i: number) => {
            const paramKey = param.token.text;
            const argumentValue = args[i];
            set(newEnv, paramKey, argumentValue);
          });
          try {
            statements.forEach((statement) => statement.evaluate(newEnv));
            return 'nil';
          } catch (returnValue) {
            return returnValue;
          }
        },
      };
      set(environment, identifierNode.token.text, functionObject);
      return null;
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterBlockStatementsBuilt,
  };
}
