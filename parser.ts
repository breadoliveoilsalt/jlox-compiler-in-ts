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

type AstTree = {
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
    currentTokenHead: tokenHeadAfterExpressionEval,
  } = buildExpression({
    tokens,
    currentTokenHead: currentTokenHead + 1,
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
      evaluate(environment: Environment) {
        return expressionNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
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

function buildIdentifier({
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
    const { node, currentTokenHead: tokenHeadAfterPrimaryEval } = build({
      tokens,
      currentTokenHead,
    });

    return {
      node,
      currentTokenHead: tokenHeadAfterPrimaryEval,
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

        // TODO: make sure to remove unneeded stuff like blockEnv
        // from buildFunction
        return callee.call(evaluatedArguments, environment);
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
    const { node: right, currentTokenHead: tokenHeadAfterUnaryEval } =
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
      currentTokenHead: tokenHeadAfterUnaryEval,
    };
  }

  return buildCall({ tokens, currentTokenHead });
}

function buildFactor({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterUnaryEval } = buildUnary({
    tokens,
    currentTokenHead,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterUnaryEval }),
      TOKEN_NAMES.SLASH,
      TOKEN_NAMES.STAR,
    )
  ) {
    const token = tokens[tokenHeadAfterUnaryEval];

    const { node: right, currentTokenHead: tokenHeadAfterRightEval } =
      buildUnary({
        tokens,
        currentTokenHead: tokenHeadAfterUnaryEval + 1,
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
      currentTokenHead: tokenHeadAfterRightEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterUnaryEval,
  };
}

function buildTerm({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterFactorEval } =
    buildFactor({
      tokens,
      currentTokenHead,
    });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterFactorEval }),
      TOKEN_NAMES.MINUS,
      TOKEN_NAMES.PLUS,
    )
  ) {
    const token = tokens[tokenHeadAfterFactorEval];

    const { node: right, currentTokenHead: tokenHeadAfterRightEval } =
      buildFactor({
        tokens,
        currentTokenHead: tokenHeadAfterFactorEval + 1,
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
      currentTokenHead: tokenHeadAfterRightEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterFactorEval,
  };
}

function buildComparison({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterTermEval } = buildTerm({
    tokens,
    currentTokenHead,
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

    const { node: right, currentTokenHead: tokenHeadAfterRightEval } =
      buildTerm({
        tokens,
        currentTokenHead: tokenHeadAfterTermEval + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        const leftExpr = this.left.evaluate(environment);
        const rightExpr = this.right.evaluate(environment);
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
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterTermEval,
  };
}

function buildEquality({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterComparisonEval } =
    buildComparison({
      tokens,
      currentTokenHead,
    });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterComparisonEval }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const token = tokens[tokenHeadAfterComparisonEval];

    const { node: right, currentTokenHead: tokenHeadAfterRightEval } =
      buildComparison({
        tokens,
        currentTokenHead: tokenHeadAfterComparisonEval + 1,
      });

    const node = {
      token,
      left,
      right,
      evaluate(environment: Environment) {
        if (this.token.name === TOKEN_NAMES.EQUAL_EQUAL)
          return (
            !!this.left &&
            this.left?.evaluate(environment) ===
              this.right?.evaluate(environment)
          );
        if (this.token.name === TOKEN_NAMES.BANG_EQUAL)
          return (
            this.left!! &&
            this.left?.evaluate(environment) !==
              this.right?.evaluate(environment)
          );
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterRightEval,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterComparisonEval,
  };
}

function buildAnd({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: leftNode, currentTokenHead: tokenHeadAfterEqualityBuiltLeft } =
    buildEquality({
      tokens,
      currentTokenHead,
    });

  const currentToken = tokens[tokenHeadAfterEqualityBuiltLeft];

  if (matches(currentToken, TOKEN_NAMES.AND)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
    } = buildAnd({
      tokens,
      currentTokenHead: tokenHeadAfterEqualityBuiltLeft + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterEqualityBuiltLeft],
      evaluate(environment: Environment) {
        const left = leftNode.evaluate(environment);
        if (!left) return left;
        return rightNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
    };
  }

  return {
    node: leftNode,
    currentTokenHead: tokenHeadAfterEqualityBuiltLeft,
  };
}

function buildOr({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node: leftNode, currentTokenHead: tokenHeadAfterAndBuilt } = buildAnd(
    {
      tokens,
      currentTokenHead,
    },
  );

  const currentToken = tokens[tokenHeadAfterAndBuilt];

  if (matches(currentToken, TOKEN_NAMES.OR)) {
    const {
      node: rightNode,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
    } = buildOr({
      tokens,
      currentTokenHead: tokenHeadAfterAndBuilt + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterAndBuilt],
      evaluate(environment: Environment) {
        const left = leftNode.evaluate(environment);
        if (!!left) return left;
        return rightNode.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterEqualityEvalRight,
    };
  }

  return {
    node: leftNode,
    currentTokenHead: tokenHeadAfterAndBuilt,
  };
}

function buildAssignment({
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
      node: nodeFromRecursiveAssignmentEval,
      currentTokenHead: tokenHeadAfterAssignmentEval,
    } = buildAssignment({
      tokens,
      currentTokenHead: tokenHeadAfterOrBuild + 1,
    });

    const assignmentToken = tokens[tokenHeadAfterAssignmentEval];

    if (nodeFromOrBuild.token.name === TOKEN_NAMES.IDENTIFIER) {
      const node = {
        token: assignmentToken,
        evaluate(environment: Environment) {
          const key = nodeFromOrBuild.token.text;
          const value = nodeFromRecursiveAssignmentEval.evaluate(environment);
          update(environment, key, value);
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterAssignmentEval,
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

function buildExpression({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  return buildAssignment({ tokens, currentTokenHead });
}

function buildExpressionStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  const { node: expression, currentTokenHead: tokenHeadAfterExpressionEval } =
    buildExpression({ tokens, currentTokenHead });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
      TOKEN_NAMES.SEMICOLON,
    )
  ) {
    const node = {
      token,
      evaluate(environment: Environment) {
        return expression.evaluate(environment);
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
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
}: {
  tokens: Tokens;
  currentTokenHead: number;
  statements?: Array<AstTree>;
}) {
  // TODO: remove after refactor?
  // NOTE:
  // - buildBlock assumes left brace has been consumed
  // - but buildBlock consumes the right brace before it returns
  // - buildBlock assumes new "outer" env has been passed to it
  //    - This way the parent that calls buildBlock can keep
  //      a reference to that environment. See how `buildFunction`
  //      uses `blockEnv`, for example.
  // - buildBlock consumes/resets this outer env before it returns,
  //   so the returned env is the parent's env, however.
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

  // TODO: Sometimes the code says `ExprEval`, and sometimes
  // it says `ExpressionEval`. Be consistent.
  const { node, currentTokenHead: tokenHeadAfterExprEval } = buildDeclaration({
    tokens,
    currentTokenHead,
  });

  const updatedStatements = [...statements, node];

  return buildBlock({
    tokens,
    currentTokenHead: tokenHeadAfterExprEval,
    statements: updatedStatements,
  });
}

function buildForStatement({
  tokens,
  currentTokenHead,
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
    });
  } else {
    initializer = buildExpressionStatement({
      tokens,
      currentTokenHead: currentTokenHead + 2,
    });
  }

  const tokenHeadAfterInitializer = initializer
    ? initializer.currentTokenHead
    : currentTokenHead + 3;

  if (!matches(tokens[tokenHeadAfterInitializer], TOKEN_NAMES.SEMICOLON)) {
    condition = buildExpression({
      tokens,
      currentTokenHead: tokenHeadAfterInitializer,
    });
  }

  const tokenHeadAfterCondition = condition
    ? condition.currentTokenHead
    : tokenHeadAfterInitializer;

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
    });
  }

  const tokenHeadAfterIncrement = increment
    ? increment.currentTokenHead
    : tokenHeadAfterInitializer;

  if (!matches(tokens[tokenHeadAfterIncrement], TOKEN_NAMES.RIGHT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing ")" after for clause',
      lineNumber: tokens[tokenHeadAfterCondition].lineNumber,
    });
  }

  const { node: body, currentTokenHead: tokenHeadAfterStatementBuild } =
    buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterIncrement + 1,
    });

  // NOTE: Taking a "syntactic sugar" approach to
  // building the AST node, rather than replicating
  // a `for` loop in JavaScript.
  const statements = increment ? [body, increment.node] : [body];

  const node = {
    token: tokens[tokenHeadAfterIncrement],
    evaluate(environment: Environment) {
      // Force true if no condition specified
      initializer && initializer.node.evaluate(environment);
      while (condition ? condition.node.evaluate(environment) : true) {
        statements.forEach((statement) => statement.evaluate(environment));
      }
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterStatementBuild,
  };
}

function buildStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.LEFT_BRACE)) {
    const { currentTokenHead: tokenHeadAfterBlockEval, statements } =
      buildBlock({
        tokens,
        currentTokenHead: currentTokenHead + 1,
      });

    // if (!envAfterBlockEval) {
    //   throw new CompilerError({
    //     name: 'DeveloperError',
    //     message: 'Missing env in return from buildBlock',
    //     lineNumber: token.lineNumber,
    //   });
    // }

    const node = {
      token,
      evaluate(environment: Environment) {
        const newEnv = { outerScope: environment };
        statements.forEach((statement) => statement.evaluate(newEnv));
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterBlockEval,
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
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
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
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterWhileConditionBuilt + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterWhileBodyBuilt],
      evaluate(environment: Environment) {
        while (whileConditionNode.evaluate(environment)) {
          whileBodyNode.evaluate(environment);
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterWhileBodyBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.RETURN)) {
    const nextToken = tokens[currentTokenHead + 1];
    if (matches(nextToken, TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: tokens[currentTokenHead + 2],
        evaluate() {
          throw null;
        },
      };
      return {
        node,
        currentTokenHead: currentTokenHead + 2,
      };
    }

    const {
      node: expression,
      currentTokenHead: tokenHeadAfterExpressionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 1,
    });

    if (matches(tokens[tokenHeadAfterExpressionBuilt], TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: tokens[tokenHeadAfterExpressionBuilt],
        evaluate(environment: Environment) {
          throw expression.evaluate(environment);
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
      };
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing semicolon ";" after return statement',
      lineNumber: token.lineNumber,
    });
  }

  if (matches(token, TOKEN_NAMES.PRINT)) {
    const { node: expression, currentTokenHead: tokenHeadAfterExpressionEval } =
      buildExpression({
        tokens,
        currentTokenHead: currentTokenHead + 1,
      });

    if (
      matches(
        peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
        TOKEN_NAMES.SEMICOLON,
      )
    ) {
      const node = {
        token,
        evaluate(environment: Environment) {
          systemPrint(expression.evaluate(environment));
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionEval + 1,
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
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
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
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterIfConditionBuilt + 1,
    });

    if (matches(tokens[tokenHeadAfterIfBranchBuilt], TOKEN_NAMES.ELSE)) {
      const {
        node: elseBranchNode,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
      } = buildStatement({
        tokens,
        currentTokenHead: tokenHeadAfterIfBranchBuilt + 1,
      });

      const node = {
        token: tokens[tokenHeadAfterElseBranchBuilt],
        evaluate(environment: Environment) {
          if (ifConditionNode.evaluate(environment)) {
            return ifBranchNode.evaluate(environment);
          } else {
            return elseBranchNode.evaluate(environment);
          }
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
      };
    }

    const node = {
      token: tokens[tokenHeadAfterIfBranchBuilt],
      evaluate(environment: Environment) {
        if (ifConditionNode.evaluate(environment)) {
          return ifBranchNode.evaluate(environment);
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterIfBranchBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.FOR)) {
    return buildForStatement({ tokens, currentTokenHead });
  }

  return buildExpressionStatement({ tokens, currentTokenHead });
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
    const node = {
      token: tokens[currentTokenHead + 1],
      evaluate(environment: Environment) {
        set(environment, varName, undefined);
        return null;
      },
    };

    return {
      node,
      currentTokenHead: currentTokenHead + 3,
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
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 3,
    });

    if (matches(tokens[tokenHeadAfterExpressionEval], TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: identifier,
        evaluate(environment: Environment) {
          set(environment, varName, expressionNode.evaluate(environment));
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionEval + 1,
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
};

function buildParameters({
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

function buildFunction({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
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

  // NOTE: This is the interface expected by `buildCall` when
  // calling `execute()` on a functionDeclaration node
  const functionObject = {
    parameters: parameterNodes,
    arity() {
      return parameterNodes.length;
    },
    call(args: AstTree[], environment: Environment) {
      const newEnv = { outerScope: environment };
      parameterNodes.forEach((param, i: number) => {
        const paramKey = param.token.text;
        const argumentValue = args[i];
        set(newEnv, paramKey, argumentValue);
      });
      try {
        // console.dir({ newEnv }, { depth: null });
        console.dir({statements}, {depth: null})
        statements.forEach((statement) => statement.evaluate(newEnv));
        return 'nil';
      } catch (returnValue) {
        // console.dir({ returnValue });
        return returnValue;
      }
    },
  };

  const node = {
    token: tokens[tokenHeadAfterBlockStatementsBuilt],
    evaluate(environment: Environment) {
      set(environment, identifierNode.token.text, functionObject);
      // if (envAfterBlockStatementsBuilt !== null) {
      //   set(
      //     envAfterBlockStatementsBuilt,
      //     identifierNode.token.text,
      //     functionObject,
      //   );
      // }
      return null;
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterBlockStatementsBuilt,
  };
}

function buildDeclaration({
  tokens,
  currentTokenHead = 0,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.FUN)) {
    return buildFunction({ tokens, currentTokenHead });
  }

  if (matches(token, TOKEN_NAMES.VAR)) {
    return buildVar({ tokens, currentTokenHead });
  }

  return buildStatement({ tokens, currentTokenHead });
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

  const { node, currentTokenHead: tokenHeadAfterExprEval } = buildDeclaration({
    tokens,
    currentTokenHead,
  });

  const updatedStatements = [...statements, node];

  return parse({
    tokens,
    currentTokenHead: tokenHeadAfterExprEval,
    statements: updatedStatements,
  });
}
