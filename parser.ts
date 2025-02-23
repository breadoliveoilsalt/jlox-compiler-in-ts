import { TOKEN_NAMES, type Token, type Tokens } from './scanner';
import { CompilerError, RuntimeError } from './errors';
import { matches, peek, sequencer, envHelpers } from './helpers';
import { systemPrint } from './systemPrint';

export type Environment = {
  outerScope: null | Environment;
  [key: string]: any;
};

export type NodeBuilderParams = {
  tokens: Tokens;
  currentTokenHead: number;
  environment: Environment;
};

export type NodeBuilderResult = {
  node: AstTree;
  currentTokenHead: number;
  environment: Environment;
};

export type NodeBuilder = ({
  tokens,
  currentTokenHead,
}: NodeBuilderParams) => NodeBuilderResult;

type PrimaryBuilders = {
  [key: string]: NodeBuilder;
};

type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: () => any;
};

const { set, update, get, has } = envHelpers();

function buildTrue({
  tokens,
  currentTokenHead,
  environment,
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
    environment,
  };
}

function buildFalse({
  tokens,
  currentTokenHead,
  environment,
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
    environment,
  };
}

function buildParenthetical({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: expressionNode,
    currentTokenHead: tokenHeadAfterExpressionEval,
    environment: envAfterExpressionEval,
  } = buildExpression({
    tokens,
    currentTokenHead: currentTokenHead + 1,
    environment,
  });

  if (
    matches(
      // TODO: Maybe I don't need peek at all...just do tokens[head]
      // ...much cleaner
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
      TOKEN_NAMES.RIGHT_PAREN,
    )
  ) {
    // TODO: It's interesting (and off-putting) that a parenthetical
    // node would only have one token in the token property,
    // the right paren, when there is both a left and right
    // paren at play. Does Node really need to return token?
    // Consider changing token to tokens array for a node
    const token = tokens[tokenHeadAfterExpressionEval];

    const node = {
      token,
      evaluate() {
        return expressionNode.evaluate();
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
      environment: envAfterExpressionEval,
    };
  }

  throw new CompilerError({
    name: 'JloxSyntaxError',
    message:
      'Something went wrong evaluating a parenthetical. Is there a missing closing parentheses ")"?',
    lineNumber: tokens[tokenHeadAfterExpressionEval].lineNumber,
  });
}

function buildNumber({
  tokens,
  currentTokenHead,
  environment,
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
    environment,
  };
}

function buildString({
  tokens,
  currentTokenHead,
  environment,
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
    environment,
  };
}

function buildIdentifier({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];
  const identifierName = token.text;

  // TODO: Check this is correct. Will this cause problems building functions?
  if (!has(environment, identifierName)) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: `Undefined variable (identifier): "${token.text}"`,
      lineNumber: token.lineNumber,
    });
  }

  const node = {
    token,
    evaluate() {
      return get(environment, identifierName) ?? 'nil';
    },
  };

  return {
    node,
    currentTokenHead: currentTokenHead + 1,
    environment,
  };
}

function buildPrimary({
  tokens,
  currentTokenHead,
  environment,
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
    const {
      node,
      currentTokenHead: tokenHeadAfterPrimaryEval,
      environment: envAfterPrimaryBuild,
    } = build({
      tokens,
      currentTokenHead,
      environment,
    });

    return {
      node,
      currentTokenHead: tokenHeadAfterPrimaryEval,
      environment: envAfterPrimaryBuild,
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
  environment: Environment;
};

function buildArguments({
  tokens,
  currentTokenHead,
  environment,
  argumentNodes,
}: NodeBuilderParams & {
  argumentNodes: ArgumentsResult['argumentNodes'];
}): ArgumentsResult {
  if (matches(tokens[currentTokenHead], TOKEN_NAMES.RIGHT_PAREN)) {
    return {
      argumentNodes,
      currentTokenHead,
      environment,
    };
  }

  const argumentHead = matches(tokens[currentTokenHead], TOKEN_NAMES.COMMA)
    ? currentTokenHead + 1
    : currentTokenHead;

  // TODO: I like this naming convention here: intent (Argument) + builder (Expression)
  const {
    node: argumentExpressionNode,
    currentTokenHead: tokenHeadAfterArgumentExpressionBuilt,
    environment: envAfterArgumentExpressionBuilt,
  } = buildExpression({
    tokens,
    currentTokenHead: argumentHead,
    environment,
  });

  return buildArguments({
    tokens,
    currentTokenHead: tokenHeadAfterArgumentExpressionBuilt,
    environment: envAfterArgumentExpressionBuilt,
    argumentNodes: [...argumentNodes, argumentExpressionNode],
  });
}

function buildCall({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: primaryNode,
    currentTokenHead: tokenHeadAfterPrimaryBuilt,
    environment: envAfterPrimaryBuilt,
  } = buildPrimary({
    tokens,
    currentTokenHead: currentTokenHead,
    environment,
  });

  // TODO: check this can handle multiple back to back calls ()()()

  if (matches(tokens[tokenHeadAfterPrimaryBuilt], TOKEN_NAMES.LEFT_PAREN)) {
    // I wonder if here is a place to put the check whether the node above
    // is a function
    const {
      argumentNodes,
      currentTokenHead: tokenHeadAfterArgumentsBuilt,
      environment: envAfterArgumentsBuilt,
    } = buildArguments({
      tokens,
      currentTokenHead: tokenHeadAfterPrimaryBuilt + 1,
      environment: envAfterPrimaryBuilt,
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
      evaluate() {
        const callee = primaryNode.evaluate();
        // TODO: Put some kind of typecheck here to verify that callee is a valid
        // functionObject
        if (!Object.hasOwn(callee, "call") || typeof callee.call !== "function") {
          throw new RuntimeError({
            name: 'RuntimeError',
            message:
              'There is an attempt to call something that is not a function',
            lineNumber: tokens[tokenHeadAfterArgumentsBuilt].lineNumber,
          });
        }

        const evaluatedArguments = this.argumentNodes.map((argument) =>
          argument.evaluate(),
        );

        // Check number of arguments against function's arity
        if (evaluatedArguments.length !== callee.arity()) {
          throw new RuntimeError({
            name: 'RuntimeError',
            message:
              "Arguments passed to function do not match function's arity",
            lineNumber: tokens[tokenHeadAfterArgumentsBuilt].lineNumber,
          });
        }

        return callee.call(evaluatedArguments)
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterArgumentsBuilt,
      environment: envAfterArgumentsBuilt,
    };
  }

  return {
    node: primaryNode,
    currentTokenHead: tokenHeadAfterPrimaryBuilt,
    environment: envAfterPrimaryBuilt,
  };
}

function buildUnary({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  if (matches(currentToken, TOKEN_NAMES.BANG, TOKEN_NAMES.MINUS)) {
    const {
      node: right,
      currentTokenHead: tokenHeadAfterUnaryEval,
      environment: envAfterUnaryEval,
    } = buildUnary({
      tokens,
      currentTokenHead: currentTokenHead + 1,
      environment,
    });

    const node = {
      token: currentToken,
      right,
      evaluate() {
        const right = this.right.evaluate();
        if (this.token.name === TOKEN_NAMES.BANG) return !right;
        // NOTE: Below checks for number type to prevent
        // javascript oddities like `14 -true`, which evaluates to 13
        if (this.token.name === TOKEN_NAMES.MINUS && typeof right === 'number')
          return -right;
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterUnaryEval,
      environment: envAfterUnaryEval,
    };
  }

  return buildCall({ tokens, currentTokenHead, environment });
}

function buildFactor({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: left,
    currentTokenHead: tokenHeadAfterUnaryEval,
    environment: envAfterUnaryEval,
  } = buildUnary({
    tokens,
    currentTokenHead,
    environment,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterUnaryEval }),
      TOKEN_NAMES.SLASH,
      TOKEN_NAMES.STAR,
    )
  ) {
    const token = tokens[tokenHeadAfterUnaryEval];

    const {
      node: right,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondUnaryEval,
    } = buildUnary({
      tokens,
      currentTokenHead: tokenHeadAfterUnaryEval + 1,
      environment: envAfterUnaryEval,
    });

    const node = {
      token,
      left,
      right,
      evaluate() {
        const leftExpr = this.left.evaluate();
        const rightExpr = this.right.evaluate();
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
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondUnaryEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterUnaryEval,
    environment,
  };
}

function buildTerm({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: left,
    currentTokenHead: tokenHeadAfterFactorEval,
    environment: envAfterFactorEval,
  } = buildFactor({
    tokens,
    currentTokenHead,
    environment,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterFactorEval }),
      TOKEN_NAMES.MINUS,
      TOKEN_NAMES.PLUS,
    )
  ) {
    const token = tokens[tokenHeadAfterFactorEval];

    const {
      node: right,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondFactorEval,
    } = buildFactor({
      tokens,
      currentTokenHead: tokenHeadAfterFactorEval + 1,
      environment: envAfterFactorEval,
    });

    const node = {
      token,
      left,
      right,
      evaluate() {
        const leftExpr = this.left.evaluate();
        const rightExpr = this.right.evaluate();
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
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondFactorEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterFactorEval,
    environment: envAfterFactorEval,
  };
}

function buildComparison({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: left,
    currentTokenHead: tokenHeadAfterTermEval,
    environment: envAfterTermEval,
  } = buildTerm({
    tokens,
    currentTokenHead,
    environment,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterTermEval }),
      TOKEN_NAMES.GREATER_EQUAL,
      TOKEN_NAMES.GREATER,
      TOKEN_NAMES.LESS_EQUAL,
      TOKEN_NAMES.LESS,
    )
  ) {
    const token = tokens[tokenHeadAfterTermEval];

    const {
      node: right,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondTermEval,
    } = buildTerm({
      tokens,
      currentTokenHead: tokenHeadAfterTermEval + 1,
      environment: envAfterTermEval,
    });

    const node = {
      token,
      left,
      right,
      evaluate() {
        const leftExpr = this.left.evaluate();
        const rightExpr = this.right.evaluate();
        switch (this.token.name) {
          case TOKEN_NAMES.GREATER_EQUAL:
            return leftExpr >= rightExpr;
          case TOKEN_NAMES.GREATER:
            return leftExpr > rightExpr;
          case TOKEN_NAMES.LESS_EQUAL:
            return leftExpr <= rightExpr;
          case TOKEN_NAMES.LESS:
            return leftExpr < rightExpr;
          default:
            throw new CompilerError({
              name: 'JloxSyntaxError',
              message: `Failed to parse comparison: ${leftExpr}, ${token.text}, ${rightExpr}`,
              lineNumber: token.lineNumber,
            });
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondTermEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterTermEval,
    environment: envAfterTermEval,
  };
}

function buildEquality({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: left,
    currentTokenHead: tokenHeadAfterComparisonEval,
    environment: envAfterComparisonEval,
  } = buildComparison({
    tokens,
    currentTokenHead,
    environment,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterComparisonEval }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const token = tokens[tokenHeadAfterComparisonEval];

    const {
      node: right,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondComparisonEval,
    } = buildComparison({
      tokens,
      currentTokenHead: tokenHeadAfterComparisonEval + 1,
      environment: envAfterComparisonEval,
    });

    const node = {
      token,
      left,
      right,
      evaluate() {
        if (this.token.name === TOKEN_NAMES.EQUAL_EQUAL)
          return (
            !!this.left && this.left?.evaluate() === this.right?.evaluate()
          );
        if (this.token.name === TOKEN_NAMES.BANG_EQUAL)
          return (
            this.left!! && this.left?.evaluate() !== this.right?.evaluate()
          );
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightEval,
      environment: envAfterSecondComparisonEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterComparisonEval,
    environment: envAfterComparisonEval,
  };
}

function buildAnd({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: leftNode,
    currentTokenHead: tokenHeadAfterEqualityBuiltLeft,
    environment: envAfterEqualityBuiltRight,
  } = buildEquality({
    tokens,
    currentTokenHead,
    environment,
  });

  const currentToken = tokens[tokenHeadAfterEqualityBuiltLeft];

  if (matches(currentToken, TOKEN_NAMES.AND)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
      environment: envAfterEqualityEvalRight,
    } = buildAnd({
      tokens,
      currentTokenHead: tokenHeadAfterEqualityBuiltLeft + 1,
      environment: envAfterEqualityBuiltRight,
    });

    const node = {
      token: tokens[tokenHeadAfterEqualityBuiltLeft],
      evaluate() {
        const left = leftNode.evaluate();
        if (!left) return left;
        return rightNode.evaluate();
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
      environment: envAfterEqualityEvalRight,
    };
  }

  return {
    node: leftNode,
    currentTokenHead: tokenHeadAfterEqualityBuiltLeft,
    environment: envAfterEqualityBuiltRight,
  };
}

function buildOr({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: leftNode,
    currentTokenHead: tokenHeadAfterAndBuilt,
    environment: envAfterAndBuilt,
  } = buildAnd({
    tokens,
    currentTokenHead,
    environment,
  });

  const currentToken = tokens[tokenHeadAfterAndBuilt];

  if (matches(currentToken, TOKEN_NAMES.OR)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
      environment: envAfterEqualityEvalRight,
    } = buildOr({
      tokens,
      currentTokenHead: tokenHeadAfterAndBuilt + 1,
      environment: envAfterAndBuilt,
    });

    const node = {
      token: tokens[tokenHeadAfterAndBuilt],
      evaluate() {
        const left = leftNode.evaluate();
        if (!!left) return left;
        return rightNode.evaluate();
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
      environment: envAfterEqualityEvalRight,
    };
  }

  return {
    node: leftNode,
    currentTokenHead: tokenHeadAfterAndBuilt,
    environment: envAfterAndBuilt,
  };
}

function buildAssignment({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: nodeFromOrBuild,
    currentTokenHead: tokenHeadAfterOrBuild,
    environment: envAfterOrBuild,
  } = buildOr({
    tokens,
    currentTokenHead,
    environment,
  });

  if (matches(tokens[tokenHeadAfterOrBuild], TOKEN_NAMES.EQUAL)) {
    const {
      node: nodeFromRecursiveAssignmentEval,
      currentTokenHead: tokenHeadAfterAssignmentEval,
      environment: envAfterAssignmentEval,
    } = buildAssignment({
      tokens,
      currentTokenHead: tokenHeadAfterOrBuild + 1,
      environment: envAfterOrBuild,
    });

    const assignmentToken = tokens[tokenHeadAfterAssignmentEval];

    if (nodeFromOrBuild.token.name === TOKEN_NAMES.IDENTIFIER) {
      const node = {
        token: assignmentToken,
        evaluate() {
          const key = nodeFromOrBuild.token.text;
          const value = nodeFromRecursiveAssignmentEval.evaluate();
          update(envAfterAssignmentEval, key, value);
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterAssignmentEval,
        environment: envAfterAssignmentEval,
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
    environment: envAfterOrBuild,
  };
}

function buildExpression({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  return buildAssignment({ tokens, currentTokenHead, environment });
}

function buildExpressionStatement({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const {
    node: expression,
    currentTokenHead: tokenHeadAfterExpressionEval,
    environment: envAfterExpressionEval,
  } = buildExpression({ tokens, currentTokenHead, environment });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
      TOKEN_NAMES.SEMICOLON,
    )
  ) {
    const node = {
      token,
      evaluate() {
        return expression.evaluate();
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
      environment: envAfterExpressionEval,
    };
  }

  throw new CompilerError({
    name: 'JloxSynatxError',
    message: 'Missing semicolon ";" after expression',
    lineNumber: token.lineNumber,
  });
}

function buildBlock({
  tokens,
  currentTokenHead,
  statements = [],
  environment,
}: {
  tokens: Tokens;
  currentTokenHead: number;
  statements?: Array<AstTree>;
  environment: Environment;
}) {
  // NOTE:
  // - buildBlock assumes left brace has been consumed
  // - but buildBlock consumes the right brance before it returns
  // - buildBlock assumes new "outer" env has been passed to it
  // - but buildBlock consumes/resets this outer env before it returns
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
      // NOTE: It's important to reset env to the outer
      // scope once block evaluation is complete
      environment: environment.outerScope,
      statements,
    };

  // TODO: Sometimes the code says `ExprEval`, and sometimes
  // it says `ExpressionEval`. Be consistent.
  const {
    node,
    currentTokenHead: tokenHeadAfterExprEval,
    environment: envAfterDeclarationEval,
  } = buildDeclaration({
    tokens,
    currentTokenHead,
    environment,
  });

  const updatedStatements = [...statements, node];

  return buildBlock({
    tokens,
    currentTokenHead: tokenHeadAfterExprEval,
    statements: updatedStatements,
    environment: envAfterDeclarationEval,
  });
}

function buildForStatement({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing "(" after "for"',
      lineNumber: tokens[currentTokenHead].lineNumber,
    });
  }

  let initializer;
  let condition: NodeBuilderResult | undefined;
  let increment;

  if (matches(tokens[currentTokenHead + 2], TOKEN_NAMES.SEMICOLON)) {
    initializer = null;
  } else if (matches(tokens[currentTokenHead + 2], TOKEN_NAMES.VAR)) {
    initializer = buildVar({
      tokens,
      currentTokenHead: currentTokenHead + 2,
      environment,
    });
  } else {
    initializer = buildExpressionStatement({
      tokens,
      currentTokenHead: currentTokenHead + 2,
      environment,
    });
  }
  const tokenHeadAfterInitializer = initializer
    ? initializer.currentTokenHead
    : currentTokenHead + 3;
  const envAfterInitializer = initializer
    ? initializer.environment
    : environment;

  if (!matches(tokens[tokenHeadAfterInitializer], TOKEN_NAMES.SEMICOLON)) {
    condition = buildExpression({
      tokens,
      currentTokenHead: tokenHeadAfterInitializer,
      environment: envAfterInitializer,
    });
  }

  const tokenHeadAfterCondition = condition
    ? condition.currentTokenHead
    : tokenHeadAfterInitializer;

  const envAfterCondition = condition
    ? condition.environment
    : envAfterInitializer;

  if (!matches(tokens[tokenHeadAfterCondition], TOKEN_NAMES.SEMICOLON)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing ";" after loop condition',
      lineNumber: tokens[tokenHeadAfterCondition].lineNumber,
    });
  }

  if (!matches(tokens[tokenHeadAfterCondition], TOKEN_NAMES.RIGHT_PAREN)) {
    increment = buildExpression({
      tokens,
      currentTokenHead: tokenHeadAfterCondition + 1,
      environment: envAfterCondition,
    });
  }

  const tokenHeadAfterIncrement = increment
    ? increment.currentTokenHead
    : tokenHeadAfterInitializer;

  const envAfterIncrement = increment
    ? increment.environment
    : envAfterInitializer;

  if (!matches(tokens[tokenHeadAfterIncrement], TOKEN_NAMES.RIGHT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing ")" after for clause',
      lineNumber: tokens[tokenHeadAfterCondition].lineNumber,
    });
  }

  const {
    node: body,
    currentTokenHead: tokenHeadAfterStatementBuild,
    environment: envAfterStatementBuild,
  } = buildStatement({
    tokens,
    currentTokenHead: tokenHeadAfterIncrement + 1,
    environment: envAfterIncrement,
  });

  // NOTE: Taking a "syntactic sugar" approach to
  // building the AST node, rather than replicating
  // a `for` loop in JavaScript.
  const statements = increment ? [body, increment.node] : [body];

  const node = {
    token: tokens[tokenHeadAfterIncrement],
    evaluate() {
      // Force true if no condition specified
      while (condition ? condition.node.evaluate() : true) {
        statements.forEach((statement) => statement.evaluate());
      }
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterStatementBuild,
    environment: envAfterStatementBuild,
  };
}

function buildStatement({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.LEFT_BRACE)) {
    const newScope = { outerScope: environment };

    const {
      currentTokenHead: tokenHeadAfterBlockEval,
      environment: envAfterBlockEval,
      statements,
    } = buildBlock({
      tokens,
      currentTokenHead: currentTokenHead + 1,
      environment: newScope,
    });

    if (!envAfterBlockEval) {
      throw new CompilerError({
        name: 'DeveloperError',
        message: 'Missing env in return from buildBlock',
        lineNumber: token.lineNumber,
      });
    }

    const node = {
      token,
      evaluate() {
        statements.forEach((statement) => statement.evaluate());
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterBlockEval,
      environment: envAfterBlockEval,
    };
  }

  if (matches(token, TOKEN_NAMES.WHILE)) {
    if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing "(" after "while"',
        lineNumber: token.lineNumber,
      });
    }

    const {
      node: whileConditionNode,
      currentTokenHead: tokenHeadAfterWhileConditionBuilt,
      environment: envAfterWhileConditionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
      environment,
    });

    if (
      !matches(
        tokens[tokenHeadAfterWhileConditionBuilt],
        TOKEN_NAMES.RIGHT_PAREN,
      )
    ) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing ")" after "while" condition',
        lineNumber: tokens[tokenHeadAfterWhileConditionBuilt].lineNumber,
      });
    }

    const {
      node: whileBodyNode,
      currentTokenHead: tokenHeadAfterWhileBodyBuilt,
      environment: envAfterWhileBodyBuilt,
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterWhileConditionBuilt + 1,
      environment: envAfterWhileConditionBuilt,
    });

    const node = {
      token: tokens[tokenHeadAfterWhileBodyBuilt],
      evaluate() {
        while (whileConditionNode.evaluate()) {
          whileBodyNode.evaluate();
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterWhileBodyBuilt,
      environment: envAfterWhileBodyBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.PRINT)) {
    const {
      node: expression,
      currentTokenHead: tokenHeadAfterExpressionEval,
      environment: envAfterExpressionEval,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 1,
      environment,
    });

    if (
      matches(
        peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
        TOKEN_NAMES.SEMICOLON,
      )
    ) {
      const node = {
        token,
        evaluate() {
          systemPrint(expression.evaluate());
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionEval + 1,
        environment: envAfterExpressionEval,
      };
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing semicolon ";" after expression',
      lineNumber: token.lineNumber,
    });
  }

  if (matches(token, TOKEN_NAMES.IF)) {
    if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing "(" after "if"',
        lineNumber: token.lineNumber,
      });
    }

    const {
      node: ifConditionNode,
      currentTokenHead: tokenHeadAfterIfConditionBuilt,
      environment: envAfterIfConditionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
      environment,
    });

    if (
      !matches(tokens[tokenHeadAfterIfConditionBuilt], TOKEN_NAMES.RIGHT_PAREN)
    ) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing ")" after "if" condition',
        lineNumber: tokens[tokenHeadAfterIfConditionBuilt].lineNumber,
      });
    }

    // TODO: All stuff like tokenHeadAfterIfBranchEval should be
    // tokenHeadAfterIfBranchBuilt
    const {
      node: ifBranchNode,
      currentTokenHead: tokenHeadAfterIfBranchBuilt,
      environment: envAfterIfBranchBuilt,
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterIfConditionBuilt + 1,
      environment: envAfterIfConditionBuilt,
    });

    if (matches(tokens[tokenHeadAfterIfBranchBuilt], TOKEN_NAMES.ELSE)) {
      const {
        node: elseBranchNode,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
        environment: envAfterElseBranchBuilt,
      } = buildStatement({
        tokens,
        currentTokenHead: tokenHeadAfterIfBranchBuilt + 1,
        environment: envAfterIfBranchBuilt,
      });

      const node = {
        token: tokens[tokenHeadAfterElseBranchBuilt],
        evaluate() {
          if (ifConditionNode.evaluate()) {
            return ifBranchNode.evaluate();
          } else {
            return elseBranchNode.evaluate();
          }
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
        environment: envAfterElseBranchBuilt,
      };
    }

    const node = {
      token: tokens[tokenHeadAfterIfBranchBuilt],
      evaluate() {
        if (ifConditionNode.evaluate()) {
          return ifBranchNode.evaluate();
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterIfBranchBuilt,
      environment: envAfterIfBranchBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.FOR)) {
    return buildForStatement({ tokens, currentTokenHead, environment });
  }

  return buildExpressionStatement({ tokens, currentTokenHead, environment });
}

// TODO: refactor these variables I use over and over
// to keep them simpler
// currentTokenHead => head
// perhaps object params to => context
// sequencer => tokenSequencer
// expectedTokens => expected
function buildVar({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const { assertTokenSequence } = sequencer();

  const token = tokens[currentTokenHead];

  const identifier = tokens[currentTokenHead + 1];
  const varName = identifier.text;

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.SEMICOLON },
      ],
    })
  ) {
    const updatedEnv = set(environment, varName, undefined);

    const node = {
      token: tokens[currentTokenHead + 1],
      evaluate() {
        return null;
      },
    };

    return {
      node,
      currentTokenHead: currentTokenHead + 3,
      environment: updatedEnv,
    };
  }

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.EQUAL },
      ],
    })
  ) {
    const {
      node: expressionNode,
      currentTokenHead: tokenHeadAfterExpressionEval,
      environment: envAfterExpressionEval,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 3,
      environment,
    });

    if (matches(tokens[tokenHeadAfterExpressionEval], TOKEN_NAMES.SEMICOLON)) {
      const updatedEnv = set(
        envAfterExpressionEval,
        varName,
        expressionNode.evaluate(),
      );

      const node = {
        token: identifier,
        evaluate() {
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionEval + 1,
        environment: updatedEnv,
      };
    }

    throw new CompilerError({
      name: 'JloxSyntaxError',
      message:
        'Syntax Error. Did you forget a semicolon ";" after variable declaration?',
      lineNumber: token.lineNumber,
    });
  }

  throw new CompilerError({
    name: 'JloxSynatxError',
    message: '"var" declared without identifier token as variable name',
    lineNumber: token.lineNumber,
  });
}

type ParametersResult = {
  parameterNodes: Array<AstTree>;
  currentTokenHead: number;
  environment: Environment;
};

function buildParameters({
  tokens,
  currentTokenHead,
  environment,
  parameterNodes,
}: NodeBuilderParams & {
  parameterNodes: ParametersResult['parameterNodes'];
}): ParametersResult {
  if (matches(tokens[currentTokenHead], TOKEN_NAMES.RIGHT_PAREN)) {
    return {
      parameterNodes,
      currentTokenHead,
      environment,
    };
  }

  const parametersHead = matches(tokens[currentTokenHead], TOKEN_NAMES.COMMA)
    ? currentTokenHead + 1
    : currentTokenHead;

  const {
    node: parameterIdentifierNode,
    currentTokenHead: tokenHeadAfterParameterIdentifierBuilt,
    environment: envAfterParameterIdentifierBuilt,
  } = buildIdentifier({
    tokens,
    currentTokenHead: parametersHead,
    environment,
  });

  return buildParameters({
    tokens,
    currentTokenHead: tokenHeadAfterParameterIdentifierBuilt,
    environment: envAfterParameterIdentifierBuilt,
    parameterNodes: [...parameterNodes, parameterIdentifierNode],
  });
}

function buildFunction({
  tokens,
  currentTokenHead,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const {
    node: identifierNode,
    currentTokenHead: tokenHeadAfterIdentifierBuilt,
    environment: envAfterIdentifierBuilt,
  } = buildIdentifier({
    tokens,
    currentTokenHead,
    environment,
  });

  if (!matches(tokens[tokenHeadAfterIdentifierBuilt], TOKEN_NAMES.LEFT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect ( after declaring a function name',
      lineNumber: tokens[tokenHeadAfterIdentifierBuilt].lineNumber,
    });
  }

  const {
    parameterNodes,
    currentTokenHead: tokenHeadAfterParametersBuilt,
    environment: envAfterParametersBuilt,
  } = buildParameters({
    tokens,
    currentTokenHead: tokenHeadAfterIdentifierBuilt + 1,
    environment: envAfterIdentifierBuilt,
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

  const blockEnv = { outerScope: envAfterParametersBuilt };

  const {
    currentTokenHead: tokenHeadAfterBlockStatementsBuilt,
    environment: envAfterBlockStatementsBuilt,
    statements,
  } = buildBlock({
    tokens,
    currentTokenHead: tokenHeadAfterParametersBuilt + 2,
    environment: blockEnv,
  });

  if (
    !matches(
      tokens[tokenHeadAfterBlockStatementsBuilt],
      TOKEN_NAMES.RIGHT_BRACE,
    )
  ) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Expect } after a function body',
      lineNumber: tokens[tokenHeadAfterParametersBuilt].lineNumber,
    });
  }

  // NOTE: This is the interface expected by `buildCall` when
  // calling `execute()` on a functionDeclaration node
  const functionObject = {
    blockStatements: statements,
    blockEnv,
    parameters: parameterNodes,
    arity() {
      return parameterNodes.length;
    },
    call(args: any) {
      parameterNodes.forEach((param, i: number) => {
        const paramKey = param.token.text;
        const argumentValue = args[i].evaluate();
        set(environment, paramKey, argumentValue);
      });
      statements.forEach((statement) => statement.evaluate());
    },
  };

  const node = {
    token: tokens[tokenHeadAfterBlockStatementsBuilt],
    evaluate() {
      if (envAfterBlockStatementsBuilt !== null) {
        set(
          envAfterBlockStatementsBuilt,
          identifierNode.token.text,
          functionObject,
        );
      }
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterBlockStatementsBuilt,
    environment: envAfterBlockStatementsBuilt ?? { outerScope: null },
  };
}

function buildDeclaration({
  tokens,
  currentTokenHead = 0,
  environment,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.FUN)) {
    return buildFunction({ tokens, currentTokenHead, environment });
  }

  if (matches(token, TOKEN_NAMES.VAR)) {
    return buildVar({ tokens, currentTokenHead, environment });
  }

  return buildStatement({ tokens, currentTokenHead, environment });
}

export function parse({
  tokens,
  currentTokenHead = 0,
  statements = [],
  environment,
}: {
  tokens: Tokens;
  currentTokenHead?: number;
  statements?: Array<AstTree>;
  environment: Environment;
}) {
  if (tokens[currentTokenHead].name === TOKEN_NAMES.EOF) {
    return {
      statements,
      environment,
    };
  }

  const {
    node,
    currentTokenHead: tokenHeadAfterExprEval,
    environment: envAfterDeclarationEval,
  } = buildDeclaration({
    tokens,
    currentTokenHead,
    environment,
  });

  const updatedStatements = [...statements, node];

  return parse({
    tokens,
    currentTokenHead: tokenHeadAfterExprEval,
    statements: updatedStatements,
    environment: envAfterDeclarationEval,
  });
}
