import {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
  buildExpression,
} from '.';
import { CompilerError } from '../errors';
import { TOKEN_NAMES } from '../scanner';
import { sequencer, matches } from './helpers';

export function buildVar({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const { assertTokenSequence } = sequencer();

  const token = tokens[currentTokenHead];

  const identifier = tokens[currentTokenHead + 1];
  const varName = identifier.text;

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.SEMICOLON },
      ],
    })
  ) {
    const node = {
      token: tokens[currentTokenHead + 1],
      evaluate(environment: Environment) {
        set(environment, varName, undefined);
        return null;
      },
    };

    return {
      node,
      currentTokenHead: currentTokenHead + 3,
    };
  }

  if (
    assertTokenSequence({
      tokens,
      currentTokenHead,
      expectedTokens: [
        { name: TOKEN_NAMES.VAR },
        { name: TOKEN_NAMES.IDENTIFIER },
        { name: TOKEN_NAMES.EQUAL },
      ],
    })
  ) {
    const {
      node: expressionNode,
      currentTokenHead: tokenHeadAfterExpressionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 3,
    });

    if (matches(tokens[tokenHeadAfterExpressionBuilt], TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: identifier,
        evaluate(environment: Environment) {
          const value = expressionNode.evaluate(environment);
          set(environment, varName, value);
          return null;
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
      };
    }

    throw new CompilerError({
      name: 'JloxSyntaxError',
      message:
        'Syntax Error. Did you forget a semicolon ";" after variable declaration?',
      lineNumber: token.lineNumber,
    });
  }

  throw new CompilerError({
    name: 'JloxSynatxError',
    message: '"var" declared without identifier token as variable name',
    lineNumber: token.lineNumber,
  });
}
