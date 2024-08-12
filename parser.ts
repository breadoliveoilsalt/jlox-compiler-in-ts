import { TOKEN_NAMES, type Token, type Tokens } from './scanner';

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

function buildTrue({ token }: {token: Token} ) {
  return {
    token,
    evaluate() {
      return true;
    },
  };
}

function buildFalse({ token }: {token: Token} ) {
  return {
    token,
    evaluate() {
      return false;
    },
  };
}

type LiteralBuilders = { [key: string]: ({token}: {token: Token} ) => AstTree};

function buildLiteral({ token }: {token: Token} ) {
  const literalBuilders: LiteralBuilders = {
    ['true']: buildTrue,
    ['false']: buildFalse,
  };

  if (literalBuilders[token.name]) return literalBuilders[token.name]({ token });

  throw new Error(`Jlox syntax error: ${token}`)

  // TODO: Should throw here if no matches with builder found.
  // This is a replacement for a switch statement.
}

function peek(remainingTokens: Tokens, offset = 0) {
  return remainingTokens[0 + offset];
}

function matches(token: Token, ...tokenNames: string[]) {
  return tokenNames.find((tokenName) => token.name === tokenName);
}

function noMore(tokens: Tokens) {
  return tokens.length === 0;
}


type AstTree = {
  token: Token;
  left?: AstTree;
  right?: AstTree;
  evaluate: () => any;
}

function recurseDownGrammar(tokens: Tokens): AstTree {
  const [token, ...remainingTokens] = tokens;
  const left = buildLiteral({ token });

  if (noMore(remainingTokens)) {
    return left;
  }

  if (
    matches(
      peek(remainingTokens),
      TOKEN_NAMES.EQUAL_EQUAL,
      TOKEN_NAMES.BANG_EQUAL,
    )
  ) {
    const [equalityToken, ...successorTokens] = remainingTokens;
    return {
      token: equalityToken,
      left,
      right: recurseDownGrammar(successorTokens),
      evaluate() {
        if (this.token.name === TOKEN_NAMES.EQUAL_EQUAL)
          return !!this.left && this.left?.evaluate() === this.right?.evaluate();
        if (this.token.name === TOKEN_NAMES.BANG_EQUAL)
          return this.left!! && this.left?.evaluate() !== this.right?.evaluate();
      },
    };
  }

  // TODO: Necessary? How to handle? Add error handling for syntax errors.
  throw new Error(`Parsing AST Tree Failed: ${tokens}`)
}

function buildTree({ tokens }: { tokens: Tokens }) {
  return recurseDownGrammar(tokens);
}

export function parse(tokens: Tokens) {
  // Goal: hide knowledge of data structure via other methods
  if (noMore(tokens)) return;
  const ast = recurseDownGrammar(tokens);
  return { ast };
}
