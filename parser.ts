import { TOKEN_NAMES, type Token, type Tokens } from './scanner';

type NodeBuilderParams = { tokens: Tokens; currentTokenHead: number };

type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: () => any;
};

type BuilderResult = {
  node: AstTree;
  currentTokenHead: number;
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

function buildTrue({ token }: { token: Token }) {
  return {
    token,
    evaluate() {
      return true;
    },
  };
}

function buildFalse({ token }: { token: Token }) {
  return {
    token,
    evaluate() {
      return false;
    },
  };
}

type LiteralBuilders = {
  [key: string]: ({ token }: { token: Token }) => AstTree;
};

// TODO:
// - Add parentheses
// - update name to buildPrimary
function buildLiteral({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): BuilderResult {
  const currentToken = tokens[currentTokenHead];

  const literalBuilders: LiteralBuilders = {
    ['true']: buildTrue,
    ['false']: buildFalse,
  };

  if (literalBuilders[currentToken.name]) {
    const build = literalBuilders[currentToken.name];
    return {
      node: build({ token: currentToken }),
      currentTokenHead: currentTokenHead + 1,
    };
  }

  throw new Error(`Jlox syntax error: ${currentToken}`);
}

// TODO: Add MINUS token to negate a number
function buildUnary({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): BuilderResult {
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

  return buildLiteral({ tokens, currentTokenHead });
}

// params { tokens, currentNodeHead }
// return { node, currentTokenHead}

function equality({ tokens, currentTokenHead }: NodeBuilderParams): AstTree {
  // Having each builder return the currentTokenHead,
  // and updating the currentTokenHead + 1 below, is the equivalent of
  // indicating that the token has been consumed.
  // Trying to avoid a global variable lurking somewhere.
  const { node: left, currentTokenHead: updatedHead } = buildUnary({
    tokens,
    currentTokenHead,
  });

  // Important for this to be at the top rule evaluated
  if (allTokensParsed({ tokens, currentTokenHead: updatedHead })) return left;

  if (matches(
      peek({ tokens, currentTokenHead: updatedHead }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const currentToken = tokens[updatedHead];
    const { node: right } = buildUnary({
      tokens,
      currentTokenHead: updatedHead + 1,
    });

    return {
      token: currentToken,
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
  }

  return left;
  // TODO: Add error handling for syntax errors.
}

function expression({ tokens, currentTokenHead = 0 }: NodeBuilderParams) {
  return equality({ tokens, currentTokenHead });
}

export function parse(tokens: Tokens) {
  // TODO: hide knowledge of data structure via other methods
  if (tokens.length === 0) return;
  const ast = expression({ tokens, currentTokenHead: 0 });
  return { ast };
}
