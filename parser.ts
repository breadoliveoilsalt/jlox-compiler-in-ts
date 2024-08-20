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

// TODO: simplify type signature by making one for the
// buidler functions in general - no need to put arg type and return
// type each time then
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
  return tokenNames.find((tokenName) => token.name === tokenName);
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
  return tokens[currentTokenHead + offset];
}

function allTokensParsed({ tokens, currentTokenHead }: NodeBuilderParams) {
  if (currentTokenHead > tokens.length)
    throw new Error(
      `Something is advancing currentTokenHead too much. Got ${currentTokenHead}`,
    );
  return currentTokenHead === tokens.length;
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

// TODO: I have to refactor all the builders to take into account
// standard params and standard return values
// UPTO: converted builTrue; have to convert buildFase, then create buildParenthetical, then update caller to accept new return values
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
    // TODO: Seems odd and off that node would only have one token,
    // the right paren, when there is both a left and right paren at play.
    // Does Node really need to return token?
    const token = tokens[tokenHeadAfterExpressionEval];

    const node = {
      token,
      evaluate() {
        return expressionNode.evaluate();
      },
    };

    // TODO: be consistent with object return values: wrap in parens, or not.
    return {
      node,
      currentTokenHead: tokenHeadAfterExpressionEval + 1,
    };
  }

  throw new Error(
    `Something went wrong evaluating a parenthetical, at token ${tokens[tokenHeadAfterExpressionEval]}`,
  );
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

  throw new Error(`Jlox syntax error: ${currentToken}`);
}

// TODO: Add MINUS token to negate a number
function buildUnary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const currentToken = tokens[currentTokenHead];

  if (matches(currentToken, TOKEN_NAMES.BANG, TOKEN_NAMES.MINUS)) {
    const { node: right, currentTokenHead: updatedHead } = buildUnary({
      tokens,
      currentTokenHead: currentTokenHead + 1,
    });

    const node = {
      token: currentToken,
      right,
      evaluate() {
        if (this.token.name === TOKEN_NAMES.BANG) return !this.right.evaluate();
        if (this.token.name === TOKEN_NAMES.MINUS)
          throw new Error('MINUS not implemented yet');
      },
    };

    return { node, currentTokenHead: updatedHead };
  }

  return buildPrimary({ tokens, currentTokenHead });
}

// params { tokens, currentNodeHead }
// return { node, currentTokenHead}

function buildEquality({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  // Having each builder return the currentTokenHead,
  // and updating the currentTokenHead + 1 below, is the equivalent of
  // indicating that the token has been consumed.
  // Trying to avoid a global variable lurking somewhere.
  const { node: left, currentTokenHead: tokenHeadAfterLeftEval } = buildUnary({
    tokens,
    currentTokenHead,
  });

  // Important for this to be at the top rule evaluated
  if (allTokensParsed({ tokens, currentTokenHead: tokenHeadAfterLeftEval })) {
    return {
      node: left,
      currentTokenHead: tokenHeadAfterLeftEval,
    };
  }

  if (
    matches(
      peek({ tokens, currentTokenHead: tokenHeadAfterLeftEval }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const token = tokens[tokenHeadAfterLeftEval];

    const { node: right, currentTokenHead: tokenHeadAfterRightEval } =
      buildUnary({
        tokens,
        currentTokenHead: tokenHeadAfterLeftEval,
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
      currentTokenHead: tokenHeadAfterRightEval + 1,
    };
  }

  return {
    node: left,
    currentTokenHead: tokenHeadAfterLeftEval,
  };
  // TODO: Add error handling for syntax errors.
}

function expression({
  tokens,
  currentTokenHead = 0,
}: NodeBuilderParams): NodeBuilderResult {
  const { node, currentTokenHead: tokenHeadAfterExpressionEval } =
    buildEquality({ tokens, currentTokenHead });

  return {
    node,
    currentTokenHead: tokenHeadAfterExpressionEval,
  };
}

export function parse(tokens: Tokens) {
  // TODO: hide knowledge of data structure via other methods
  if (tokens.length === 0) return;
  const { node: ast } = expression({ tokens, currentTokenHead: 0 });
  return { ast };
}
