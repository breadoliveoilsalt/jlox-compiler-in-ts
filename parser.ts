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

function buildTree({ tokens }) {

  // Goal: hide knowledge of data structure via other methods
  if (tokens.length === 0) return;
  const [token, ...remainingTokens] = tokens;

  const builders = {
    bang: buildBang,
    true: buildTrue,
    false: buildFalse,
  }

  return builders[token.name]({ token, remainingTokens })
}

export function parse({ tokens }) {
  const ast = buildTree({ tokens });
  return { ast }
}
