import { TOKEN_NAMES, type Token, type Tokens } from '../scanner';
import { CompilerError, RuntimeError } from '../errors';
import { matches, peek, envHelpers } from './helpers';
import { buildDeclaration } from './buildDeclaration';
import { buildExpression } from './buildExpression';

export type Environment = {
  outerScope: null | Environment;
  [key: string]: any;
};

export type NodeBuilderParams = {
  tokens: Tokens;
  currentTokenHead: number;
};

export type NodeBuilderResult = {
  node: AstTree;
  currentTokenHead: number;
};

export type NodeBuilder = ({
  tokens,
  currentTokenHead,
}: NodeBuilderParams) => NodeBuilderResult;

type PrimaryBuilders = {
  [key: string]: NodeBuilder;
};

export type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: (environment: Environment) => any;
};

const { set, update, get } = envHelpers();

function buildTrue({
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

function buildFalse({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const node = {
    token,
    evaluate() {
      return false;
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
  };
}

function buildParenthetical({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: expressionNode,
    currentTokenHead: tokenHeadAfterExpressionBuilt,
  } = buildExpression({
    tokens,
    currentTokenHead: currentTokenHead + 1,
  });

  if (
    matches(
      // TODO: Maybe I don't need peek at all...just do tokens[head]
      // ...much cleaner
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionBuilt }),
      TOKEN_NAMES.RIGHT_PAREN,
    )
  ) {
    // TODO: It's interesting (and off-putting) that a parenthetical
    // node would only have one token in the token property,
    // the right paren, when there is both a left and right
    // paren at play. Does Node really need to return token?
    // Consider changing token to tokens array for a node
    const token = tokens[tokenHeadAfterExpressionBuilt];

    const node = {
      token,
      evaluate(environment: Environment) {
        return expressionNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
    };
  }

  throw new CompilerError({
    name: 'JloxSyntaxError',
    message:
      'Something went wrong evaluating a parenthetical. Is there a missing closing parentheses ")"?',
    lineNumber: tokens[tokenHeadAfterExpressionBuilt].lineNumber,
  });
}

function buildNumber({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const node = {
    token,
    evaluate() {
      return parseFloat(token.text);
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
  };
}

function buildString({
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

export function buildIdentifier({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];
  const identifierName = token.text;

  // TODO: re-consider where this should be
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

function buildPrimary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  const primaryBuilders: PrimaryBuilders = {
    [TOKEN_NAMES.TRUE]: buildTrue,
    [TOKEN_NAMES.FALSE]: buildFalse,
    [TOKEN_NAMES.LEFT_PAREN]: buildParenthetical,
    [TOKEN_NAMES.NUMBER]: buildNumber,
    [TOKEN_NAMES.STRING]: buildString,
    [TOKEN_NAMES.IDENTIFIER]: buildIdentifier,
  };

  if (primaryBuilders[currentToken.name]) {
    const build = primaryBuilders[currentToken.name];
    const { node, currentTokenHead: tokenHeadAfterPrimaryBuilt } = build({
      tokens,
      currentTokenHead,
    });

    return {
      node,
      currentTokenHead: tokenHeadAfterPrimaryBuilt,
    };
  }

  throw new CompilerError({
    name: 'JloxSyntaxError',
    message: `Unrecognized primary lexeme: "${currentToken.text}"`,
    lineNumber: currentToken.lineNumber,
  });
}

type ArgumentsResult = {
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

function buildCall({
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

function buildUnary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  if (matches(currentToken, TOKEN_NAMES.BANG, TOKEN_NAMES.MINUS)) {
    const { node: right, currentTokenHead: tokenHeadAfterUnaryBuilt } =
      buildUnary({
        tokens,
        currentTokenHead: currentTokenHead + 1,
      });

    const node = {
      token: currentToken,
      right,
      evaluate(environment: Environment) {
        const right = this.right.evaluate(environment);
        if (this.token.name === TOKEN_NAMES.BANG) return !right;
        // NOTE: Below checks for number type to prevent
        // javascript oddities like `14 -true`, which evaluates to 13
        if (this.token.name === TOKEN_NAMES.MINUS && typeof right === 'number')
          return -right;
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterUnaryBuilt,
    };
  }

  return buildCall({ tokens, currentTokenHead });
}

function buildFactor({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterUnaryBuilt } = buildUnary(
    {
      tokens,
      currentTokenHead,
    },
  );

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterUnaryBuilt }),
      TOKEN_NAMES.SLASH,
      TOKEN_NAMES.STAR,
    )
  ) {
    const token = tokens[tokenHeadAfterUnaryBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildUnary({
        tokens,
        currentTokenHead: tokenHeadAfterUnaryBuilt + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        const leftExpr = this.left.evaluate(environment);
        const rightExpr = this.right.evaluate(environment);
        if (leftExpr === 'nil' || rightExpr === 'nil') {
          throw new CompilerError({
            name: 'JloxSyntaxError',
            message: `Cannot evaluate ${token.text} with a nil value: ${leftExpr} ${token.text} ${rightExpr}.`,
            lineNumber: token.lineNumber,
          });
        }
        switch (this.token.name) {
          case TOKEN_NAMES.SLASH:
            return leftExpr / rightExpr;
          case TOKEN_NAMES.STAR:
            return leftExpr * rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse factor: ${leftExpr}, ${token.text}, ${rightExpr}`,
              lineNumber: token.lineNumber,
            });
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightBuilt,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterUnaryBuilt,
  };
}

export function buildTerm({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterFactorBuilt } =
    buildFactor({
      tokens,
      currentTokenHead,
    });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterFactorBuilt }),
      TOKEN_NAMES.MINUS,
      TOKEN_NAMES.PLUS,
    )
  ) {
    const token = tokens[tokenHeadAfterFactorBuilt];

    const { node: right, currentTokenHead: tokenHeadAfterRightBuilt } =
      buildFactor({
        tokens,
        currentTokenHead: tokenHeadAfterFactorBuilt + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        const leftExpr = this.left.evaluate(environment);
        const rightExpr = this.right.evaluate(environment);
        if (leftExpr === 'nil' || rightExpr === 'nil') {
          throw new CompilerError({
            name: 'JloxSyntaxError',
            message: `Cannot evaluate ${token.text} with a nil value: ${leftExpr} ${token.text} ${rightExpr}.`,
            lineNumber: token.lineNumber,
          });
        }
        switch (this.token.name) {
          case TOKEN_NAMES.MINUS:
            return leftExpr - rightExpr;
          case TOKEN_NAMES.PLUS:
            return leftExpr + rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse term: ${leftExpr}, ${token.text}, ${rightExpr}`,
              lineNumber: token.lineNumber,
            });
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightBuilt,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterFactorBuilt,
  };
}

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
