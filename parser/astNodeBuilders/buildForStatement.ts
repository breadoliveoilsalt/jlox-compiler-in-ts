import { buildExpressionStatement } from './buildExpressionStatement';
import { buildExpression } from './buildExpression';
import type {
  NodeBuilderParams,
  NodeBuilderResult,
  Environment,
} from '../types';
import { CompilerError } from '../../errors';
import { TOKEN_NAMES } from '../../scanner';
import { buildStatement } from './buildStatement';
import { buildVar } from './buildVar';
import { matches } from '../helpers';

export function buildForStatement({
  tokens,
  currentTokenHead,
}: NodeBuilderParams): NodeBuilderResult {
  if (!matches(tokens[currentTokenHead + 1], TOKEN_NAMES.LEFT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing "(" after "for"',
      lineNumber: tokens[currentTokenHead].lineNumber,
    });
  }

  let initializer;
  let condition: NodeBuilderResult | undefined;
  let increment;

  if (matches(tokens[currentTokenHead + 2], TOKEN_NAMES.SEMICOLON)) {
    initializer = null;
  } else if (matches(tokens[currentTokenHead + 2], TOKEN_NAMES.VAR)) {
    initializer = buildVar({
      tokens,
      currentTokenHead: currentTokenHead + 2,
    });
  } else {
    initializer = buildExpressionStatement({
      tokens,
      currentTokenHead: currentTokenHead + 2,
    });
  }

  const tokenHeadAfterInitializer = initializer
    ? initializer.currentTokenHead
    : currentTokenHead + 3;

  if (!matches(tokens[tokenHeadAfterInitializer], TOKEN_NAMES.SEMICOLON)) {
    condition = buildExpression({
      tokens,
      currentTokenHead: tokenHeadAfterInitializer,
    });
  }

  const tokenHeadAfterCondition = condition
    ? condition.currentTokenHead
    : tokenHeadAfterInitializer;

  if (!matches(tokens[tokenHeadAfterCondition], TOKEN_NAMES.SEMICOLON)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing ";" after loop condition',
      lineNumber: tokens[tokenHeadAfterCondition].lineNumber,
    });
  }

  if (!matches(tokens[tokenHeadAfterCondition], TOKEN_NAMES.RIGHT_PAREN)) {
    increment = buildExpression({
      tokens,
      currentTokenHead: tokenHeadAfterCondition + 1,
    });
  }

  const tokenHeadAfterIncrement = increment
    ? increment.currentTokenHead
    : tokenHeadAfterInitializer;

  if (!matches(tokens[tokenHeadAfterIncrement], TOKEN_NAMES.RIGHT_PAREN)) {
    throw new CompilerError({
      name: 'JloxSynatxError',
      message: 'Missing ")" after for clause',
      lineNumber: tokens[tokenHeadAfterCondition].lineNumber,
    });
  }

  const { node: body, currentTokenHead: tokenHeadAfterStatementBuild } =
    buildStatement({
      tokens,
      currentTokenHead: tokenHeadAfterIncrement + 1,
    });

  // NOTE: Taking a "syntactic sugar" approach to
  // building the AST node, rather than replicating
  // a `for` loop in JavaScript.
  const statements = increment ? [body, increment.node] : [body];

  const node = {
    token: tokens[tokenHeadAfterIncrement],
    evaluate(environment: Environment) {
      // Force true if no condition specified
      initializer && initializer.node.evaluate(environment);
      while (condition ? condition.node.evaluate(environment) : true) {
        statements.forEach((statement) => statement.evaluate(environment));
      }
    },
  };

  return {
    node,
    currentTokenHead: tokenHeadAfterStatementBuild,
  };
}
