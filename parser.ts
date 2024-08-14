import { TOKEN_NAMES, type Token, type Tokens } from './scanner';

type NodeBuilderParams = { tokens: Tokens; currentTokenHead: number };

type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: () => any;
};
/*
function buildBang({
  token,
  remainingTokens,
}: {
  token: Token;
  remainingTokens: Tokens;
}) {
  return {
    token,
    right: buildTree({ tokens: remainingTokens }),
    evaluate() {
      return !this.right.evaluate();
    },
  };
}
*/

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

function buildLiteral({ tokens, currentTokenHead }: NodeBuilderParams) {
  const currentToken = tokens[currentTokenHead];

  const literalBuilders: LiteralBuilders = {
    ['true']: buildTrue,
    ['false']: buildFalse,
  };

  if (literalBuilders[currentToken.name]) {
    const build = literalBuilders[currentToken.name]
    return {
      node: build({ token: currentToken }),
      currentTokenHead: currentTokenHead + 1,
    };
  }

  throw new Error(`Jlox syntax error: ${currentToken}`);
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

function matches(token: Token, ...tokenNames: string[]) {
  return tokenNames.find((tokenName) => token.name === tokenName);
}

function equality({ tokens, currentTokenHead }: NodeBuilderParams): AstTree {
  // Having each builder return the currentTokenHead,
  // And updating the currentTokenHead + 1 below, is the equivalent of
  // indicating that the token has been consumed.
  // Trying to avoid a global variable lurking somewhere.
  const { node: left, currentTokenHead: updatedHead } = buildLiteral({
    tokens,
    currentTokenHead,
  });

  if (
    matches(
      peek({ tokens, currentTokenHead: updatedHead }),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const currentToken = tokens[updatedHead];
    const { node: right } = buildLiteral({tokens, currentTokenHead: updatedHead + 1});

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
  // TODO: Necessary? How to handle? Add error handling for syntax errors.
  // throw new Error(`Parsing AST Tree Failed: ${tokens}`);
}

function expression({ tokens, currentTokenHead = 0 }: NodeBuilderParams) {
  return equality({ tokens, currentTokenHead });
}

function noMore(tokens: Tokens) {
  return tokens.length === 0;
}

export function parse(tokens: Tokens) {
  // Goal: hide knowledge of data structure via other methods
  if (noMore(tokens)) return;
  const ast = expression({ tokens, currentTokenHead: 0 });
  return { ast };
}
