import { NodeBuilderParams, NodeBuilderResult, Environment } from '..';
import { buildExpression } from '../buildExpression';
import { buildExpressionStatement } from '../buildExpressionStatement';
import { buildBlock } from '../buildBlock';
import { buildForStatement } from '../buildForStatement';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { systemPrint } from '../../systemPrint';
import { matches, peek } from '../helpers';

// TODO: Break this one down
export function buildStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  const token = tokens[currentTokenHead];

  if (matches(token, TOKEN_NAMES.LEFT_BRACE)) {
    const { currentTokenHead: tokenHeadAfterBlockBuilt, statements } =
      buildBlock({
        tokens,
        currentTokenHead: currentTokenHead + 1,
      });

    const node = {
      token,
      evaluate(environment: Environment) {
        const newEnv = { outerScope: environment };
        statements.forEach((statement) => statement.evaluate(newEnv));
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterBlockBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.WHILE)) {
    if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing "(" after "while"',
        lineNumber: token.lineNumber,
      });
    }

    const {
      node: whileConditionNode,
      currentTokenHead: tokenHeadAfterWhileConditionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
    });

    if (
      !matches(
        tokens[tokenHeadAfterWhileConditionBuilt],
        TOKEN_NAMES.RIGHT_PAREN,
      )
    ) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing ")" after "while" condition',
        lineNumber: tokens[tokenHeadAfterWhileConditionBuilt].lineNumber,
      });
    }

    const {
      node: whileBodyNode,
      currentTokenHead: tokenHeadAfterWhileBodyBuilt,
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterWhileConditionBuilt + 1,
    });

    const node = {
      token: tokens[tokenHeadAfterWhileBodyBuilt],
      evaluate(environment: Environment) {
        while (whileConditionNode.evaluate(environment)) {
          whileBodyNode.evaluate(environment);
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterWhileBodyBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.RETURN)) {
    const nextToken = tokens[currentTokenHead + 1];
    if (matches(nextToken, TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: tokens[currentTokenHead + 2],
        evaluate() {
          throw null;
        },
      };
      return {
        node,
        currentTokenHead: currentTokenHead + 2,
      };
    }

    const {
      node: expression,
      currentTokenHead: tokenHeadAfterExpressionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 1,
    });

    if (matches(tokens[tokenHeadAfterExpressionBuilt], TOKEN_NAMES.SEMICOLON)) {
      const node = {
        token: tokens[tokenHeadAfterExpressionBuilt],
        evaluate(environment: Environment) {
          throw expression.evaluate(environment);
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
      };
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing semicolon ";" after return statement',
      lineNumber: token.lineNumber,
    });
  }

  if (matches(token, TOKEN_NAMES.PRINT)) {
    const {
      node: expression,
      currentTokenHead: tokenHeadAfterExpressionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 1,
    });

    if (
      matches(
        peek({ tokens, currentTokenHead: tokenHeadAfterExpressionBuilt }),
        TOKEN_NAMES.SEMICOLON,
      )
    ) {
      const node = {
        token,
        evaluate(environment: Environment) {
          systemPrint(expression.evaluate(environment));
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterExpressionBuilt + 1,
      };
    }

    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing semicolon ";" after expression',
      lineNumber: token.lineNumber,
    });
  }

  if (matches(token, TOKEN_NAMES.IF)) {
    if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing "(" after "if"',
        lineNumber: token.lineNumber,
      });
    }

    const {
      node: ifConditionNode,
      currentTokenHead: tokenHeadAfterIfConditionBuilt,
    } = buildExpression({
      tokens,
      currentTokenHead: currentTokenHead + 2,
    });

    if (
      !matches(tokens[tokenHeadAfterIfConditionBuilt], TOKEN_NAMES.RIGHT_PAREN)
    ) {
      throw new CompilerError({
        name: 'JloxSynatxError',
        message: 'Missing ")" after "if" condition',
        lineNumber: tokens[tokenHeadAfterIfConditionBuilt].lineNumber,
      });
    }

    const {
      node: ifBranchNode,
      currentTokenHead: tokenHeadAfterIfBranchBuilt,
    } = buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterIfConditionBuilt + 1,
    });

    if (matches(tokens[tokenHeadAfterIfBranchBuilt], TOKEN_NAMES.ELSE)) {
      const {
        node: elseBranchNode,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
      } = buildStatement({
        tokens,
        currentTokenHead: tokenHeadAfterIfBranchBuilt + 1,
      });

      const node = {
        token: tokens[tokenHeadAfterElseBranchBuilt],
        evaluate(environment: Environment) {
          if (ifConditionNode.evaluate(environment)) {
            return ifBranchNode.evaluate(environment);
          } else {
            return elseBranchNode.evaluate(environment);
          }
        },
      };

      return {
        node,
        currentTokenHead: tokenHeadAfterElseBranchBuilt,
      };
    }

    const node = {
      token: tokens[tokenHeadAfterIfBranchBuilt],
      evaluate(environment: Environment) {
        if (ifConditionNode.evaluate(environment)) {
          return ifBranchNode.evaluate(environment);
        }
      },
    };

    return {
      node,
      currentTokenHead: tokenHeadAfterIfBranchBuilt,
    };
  }

  if (matches(token, TOKEN_NAMES.FOR)) {
    return buildForStatement({ tokens, currentTokenHead });
  }

  return buildExpressionStatement({ tokens, currentTokenHead });
}
