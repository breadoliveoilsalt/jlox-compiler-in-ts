function buildTree({ tokens }) {

  // Goal: hide knowledge of data structure via other methods
  if (tokens.length === 0) return;
  const [token, ...remainingTokens] = tokens;

  function buildBang({token}){
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

  const builders = {
    bang: buildBang,
    true: buildTrue,
    false: buildFalse,
  }

  return builders[token.name]({ token })

}

export function parse({ tokens }) {
  const ast = buildTree({ tokens });
  return { ast }
}
