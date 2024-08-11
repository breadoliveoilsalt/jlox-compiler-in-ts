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

function buildLiteral({ token } ) {
  const literalBuilders = {
    true: buildTrue,
    false: buildFalse,
  }

  return literalBuilders[token.name]({ token })
}

function recurseDownGrammar({ tokens }) {
  const [token, ...remainingTokens] = tokens;
  const left = buildLiteral({token})

  return left;
  // if matches(peek(remainingTokens), TOKEN_NAMES.EQUAL_EQUAL) {

  // }


}

function buildTree({ tokens }) {

  // Goal: hide knowledge of data structure via other methods
  if (tokens.length === 0) return;


  return recurseDownGrammar({ tokens })


  const [token, ...remainingTokens] = tokens;

}

export function parse({ tokens }) {
  const ast = buildTree({ tokens });
  return { ast }
}
