import { TOKEN_NAMES } from './scanner'

function buildBang({ token, remainingTokens }) {
  return {
    token,
    right: buildTree({ tokens: remainingTokens }),
    interpret() {
      return !(this.right.interpret())
    }
  }
}

function buildTrue({ token }) {
  return {
    token,
    interpret() {
      return true
    }
  }
}

function buildFalse({ token }) {
  return {
    token,
    interpret() {
      return false
    }
  }
}

function buildLiteral({ token }) {
  const literalBuilders = {
    true: buildTrue,
    false: buildFalse,
  }

  return literalBuilders[token.name]({ token })
  // TODO: Should throw here if no matches with builder found.
  // This is a replacement for a switch statement.
}

function peek(remainingTokens, offset = 0) {
  return remainingTokens[0 + offset]
}

function matches(token, tokenName) {
  return token.name === tokenName;
}

function noMore(tokens) {
  return tokens.length === 0
}

function recurseDownGrammar(tokens) {
  const [token, ...remainingTokens] = tokens;
  const left = buildLiteral({ token })

  if(noMore(remainingTokens)) {
    return left
  }

  // [UP TO HERE - problem here: program not blowing up, but true == true
  // returns false
  if (matches(peek(remainingTokens), TOKEN_NAMES.EQUAL_EQUAL)) {
    const [ equalityToken, ...successorTokens ] = remainingTokens;
    return {
      token: equalityToken,
      left,
      right: recurseDownGrammar(successorTokens),
      interpret() {
        return this.left.interpret() === this.right.interpret()
      }
    }
  }

  // TODO: Necessary? How to handle? Add error handling for syntax errors.
  return left;
}

function buildTree({ tokens }) {
  // Goal: hide knowledge of data structure via other methods
  if (noMore(tokens)) return;

  return recurseDownGrammar(tokens)
}

export function parse({ tokens }) {
  const ast = buildTree({ tokens });
  return { ast }
}
