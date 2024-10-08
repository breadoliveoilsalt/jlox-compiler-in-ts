import { TOKEN_NAMES, type Token, type Tokens } from './scanner';
import { CompilerError } from './errors';
import { matches, peek, sequencer } from './helpers';

type Environment = {
  outterScope: null | Environment;
  [key: string]: any;
};

// TODO: make environment required
export type NodeBuilderParams = {
  tokens: Tokens;
  currentTokenHead: number;
  environment?: Environment;
};

// TODO: make environment required
export type NodeBuilderResult = {
  node: AstTree;
  currentTokenHead: number;
  environment?: Environment;
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
  } = buildExpression({ tokens, currentTokenHead: currentTokenHead + 1 });

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
      TOKEN_NAMES.RIGHT_PAREN,
    )
  ) {
    // NOTE: It's interesting (and off-putting) that a parenthetical
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

function buildPrimary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  // UPTO: add identifier
  const primaryBuilders: PrimaryBuilders = {
    [TOKEN_NAMES.TRUE]: buildTrue,
    [TOKEN_NAMES.FALSE]: buildFalse,
    [TOKEN_NAMES.LEFT_PAREN]: buildParenthetical,
    [TOKEN_NAMES.NUMBER]: buildNumber,
    // [TOKEN_NAMES.IDENTIFIER]: buildIdentifier,
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
      evaluate() {
        const right = this.right.evaluate();
        if (this.token.name === TOKEN_NAMES.BANG) return !right;
        // Checking for number type to prevent javascript oddity `14 -true`,
        // which evaluates to 13, etc.,
        if (this.token.name === TOKEN_NAMES.MINUS && typeof right === 'number')
          return -right;
      },
    };

    return { node, currentTokenHead: tokenHeadAfterUnaryEval };
  }

  return buildPrimary({ tokens, currentTokenHead });
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
      evaluate() {
        const leftExpr = this.left.evaluate();
        const rightExpr = this.right.evaluate();
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
      evaluate() {
        const leftExpr = this.left.evaluate();
        const rightExpr = this.right.evaluate();
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
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterComparisonEval,
  };
}

function buildExpression({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { node, currentTokenHead: tokenHeadAfterEqualityEval } = buildEquality({
    tokens,
    currentTokenHead,
  });

  return {
    node,
    currentTokenHead: tokenHeadAfterEqualityEval,
  };
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
      evaluate() {
        return expression.evaluate();
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

function buildStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.PRINT)) {
    const { node: expression, currentTokenHead: tokenHeadAfterExpressionEval } =
      buildExpression({ tokens, currentTokenHead: currentTokenHead + 1 });

    if (
      matches(
        peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval }),
        TOKEN_NAMES.SEMICOLON,
      )
    ) {
      const node = {
        token,
        evaluate() {
          // NOTE: Do not delete this console.log!
          console.log(expression.evaluate());
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

  return buildExpressionStatement({ tokens, currentTokenHead });
}

const globalScope: Environment = { outterScope: null };

// TODO: Consider, if I do a context, whether I can
// call a method on that context to get the currentToken...
// But then that smells like OO...a combo of data and methods
// on that data

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
  const { assertTokenSequence, not } = sequencer();
  const token = tokens[currentTokenHead];

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        not({ name: TOKEN_NAMES.SEMICOLON }),
      ],
    })
  ) {
    throw new CompilerError({
      name: 'JloxSyntaxError',
      message: 'Syntax Error. Did you forget a semicolon ";" after variable declaration?',
      lineNumber: token.lineNumber,
    });
  }

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.SEMICOLON }
      ],
    })
  ) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing semicolon ";" after variable declaration',
      lineNumber: token.lineNumber,
    });
  }
}

// UPTO: Working on bulding this out.
// Took my first crack, now trying to debug
// failures when parsing src.jlox file.
// var thing; seems ok (how to verify)?
// but not var thing = true;
// Consider writing a test
// Consider refactoring conditionals b/c they are
// unreadable
function buildDeclaration({
  tokens,
  currentTokenHead = 0,
  environment = globalScope,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.VAR)) {
    return buildVar({ tokens, currentTokenHead, environment });
  }

  return buildStatement({ tokens, currentTokenHead });

  // NOTE: BELOW IS OLD CODE
  // TODO: Refactor? Oof a lot of conditionals here.
  // Consider a funtion like `matchesTokenSequence`
  // that lists a series of expected tokens, and then
  // retunrs based on the various conditions.
  if (matches(token, TOKEN_NAMES.VAR)) {
    // TODO: Refactor `peek` calls to use offset
    if (
      matches(
        peek({ tokens, currentTokenHead, offset: 1 }),
        TOKEN_NAMES.IDENTIFIER,
      )
    ) {
      const varToken = tokens[currentTokenHead + 1];
      const varName = varToken.text;

      if (
        matches(
          peek({ tokens, currentTokenHead, offset: 2 }),
          TOKEN_NAMES.EQUAL,
        )
      ) {
        const {
          node: expressionNode,
          currentTokenHead: tokenHeadAfterExpressionEval,
        } = buildExpression({ tokens, currentTokenHead: currentTokenHead + 3 });

        if (
          matches(
            peek({
              tokens,
              currentTokenHead: tokenHeadAfterExpressionEval + 1,
            }),
            TOKEN_NAMES.SEMICOLON,
          )
        ) {
          // TODO: refactor for immutability
          environment[varName] = expressionNode.evaluate();

          const node = {
            token: varToken,
            evaluate() {
              return environment[varName];
            },
          };

          return {
            node,
            currentTokenHead: tokenHeadAfterExpressionEval + 2,
            environment,
          };
        }

        throw new CompilerError({
          name: 'JloxSynatxError',
          message:
            'Missing semicolon ";" after variable initialization and assignment',
          lineNumber: token.lineNumber,
        });
      }
      // Not followed to equal sign; set to null;

      if (
        matches(
          peek({ tokens, currentTokenHead: currentTokenHead + 2 }),
          TOKEN_NAMES.SEMICOLON,
        )
      ) {
        environment[varName] = null;

        const node = {
          token: varToken,
          evaluate() {
            return environment[varName];
          },
        };

        return {
          node,
          currentTokenHead: currentTokenHead + 3,
          environment,
        };
      }
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: '"var" declared without identifier token as variable name',
      lineNumber: token.lineNumber,
    });
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
  if (tokens[currentTokenHead].name === TOKEN_NAMES.EOF) return statements;

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
