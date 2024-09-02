import { TOKEN_NAMES, type Token, type Tokens } from './scanner';

type NodeBuilderParams = { tokens: Tokens; currentTokenHead: number };

type NodeBuilderResult = {
  node: AstTree;
  currentTokenHead: number;
};

type NodeBuilder = ({
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

function matches(token: Token, ...tokenNames: string[]) {
  return tokenNames.find((tokenName) => token?.name === tokenName);
}

function allTokensParsed({ tokens, currentTokenHead }: NodeBuilderParams) {
  // currentTokenHead is an index pointer.
  // Hence, all tokens will be evaluated when one
  // of the builders consumes the last token and
  // returns a currentTokenHead equal to tokens.length,
  // advancing the index beyond available indicies.
  return currentTokenHead === tokens.length
}

function peek({
  tokens,
  currentTokenHead,
  offset = 0,
}: {
  tokens: Tokens;
  currentTokenHead: number;
  offset?: number;
}): Token {
  if (allTokensParsed( { tokens, currentTokenHead })) return { name: 'END', text: '' };
  return tokens[currentTokenHead + offset];
}

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
  } = expression({ tokens, currentTokenHead: currentTokenHead + 1 });

  if (
    (matches(peek({ tokens, currentTokenHead: tokenHeadAfterExpressionEval })),
      TOKEN_NAMES.RIGHT_PAREN)
  ) {
    // TODO: Seems odd and off that a parenthetical node would only have one token,
    // the right paren, when there is both a left and right paren at play.
    // Does Node really need to return token?
    // Consider changing token to tokens array for a node
    const token = tokens[tokenHeadAfterExpressionEval];

    const node = {
      token,
      evaluate() {
        return (expressionNode.evaluate());
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
    };
  }

  throw new Error(
    `Something went wrong evaluating a parenthetical, at token ${tokens[tokenHeadAfterExpressionEval]}`,
  );
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

  const primaryBuilders: PrimaryBuilders = {
    [TOKEN_NAMES.TRUE]: buildTrue,
    [TOKEN_NAMES.FALSE]: buildFalse,
    [TOKEN_NAMES.LEFT_PAREN]: buildParenthetical,
    [TOKEN_NAMES.NUMBER]: buildNumber,
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

  throw new Error(`Jlox syntax error at token index ${currentTokenHead}: ${tokens}`);
}

// TODO: Add MINUS token to negate a number
function buildUnary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  if (matches(currentToken, TOKEN_NAMES.BANG, TOKEN_NAMES.MINUS)) {
    const { node: right, currentTokenHead: tokenHeadAfterUnaryEval } = buildUnary({
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
        if (this.token.name === TOKEN_NAMES.MINUS && typeof right ==='number') return -right;
      }
    };

    return { node, currentTokenHead: tokenHeadAfterUnaryEval };
  }

  return buildPrimary({ tokens, currentTokenHead });
}

// TODO: Note the repetition here where there is an evaluation of
// left expression, then check, etc. Consider refactoring into
// something like `buildBinaryExpression`.
function buildFactor({ tokens, currentTokenHead }: NodeBuilderParams): NodeBuilderResult {
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
            return leftExpr / rightExpr
          case TOKEN_NAMES.STAR:
            return leftExpr * rightExpr
          default:
            throw new Error(`Failed to parse factor: ${leftExpr}, ${token.text}, ${rightExpr}`)
        }
      }
    }

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

function buildTerm({ tokens, currentTokenHead }: NodeBuilderParams): NodeBuilderResult {
  const { node: left, currentTokenHead: tokenHeadAfterFactorEval } = buildFactor({
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
            return leftExpr - rightExpr
          case TOKEN_NAMES.PLUS:
            return leftExpr + rightExpr
          default:
            throw new Error(`Failed to parse term: ${leftExpr}, ${token.text}, ${rightExpr}`)
        }
      }
    }

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

function buildComparison({ tokens, currentTokenHead }: NodeBuilderParams): NodeBuilderResult {

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
            return leftExpr >= rightExpr
          case TOKEN_NAMES.GREATER:
            return leftExpr > rightExpr
          case TOKEN_NAMES.LESS_EQUAL:
            return leftExpr <= rightExpr
          case TOKEN_NAMES.LESS:
            return leftExpr < rightExpr
          default:
            throw new Error(`Failed to parse comparison: ${leftExpr}, ${token.text}, ${rightExpr}`)
        }
      }
    }

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
  const { node: left, currentTokenHead: tokenHeadAfterComparisonEval } = buildComparison({
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
  // TODO: Add error handling for syntax errors.
}

function expression({
  tokens,
  currentTokenHead = 0,
}: NodeBuilderParams): NodeBuilderResult {
  const { node, currentTokenHead: tokenHeadAfterEqualityEval } =
    buildEquality({ tokens, currentTokenHead });

  return {
    node,
    currentTokenHead: tokenHeadAfterEqualityEval,
  };
}

export function parse(tokens: Tokens) {
  if (tokens.length === 0) return;
  const { node: ast } = expression({ tokens, currentTokenHead: 0 });
  return { ast };
}
