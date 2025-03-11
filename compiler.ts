import { scan } from './scanner';
import { parse, type Environment } from './parser';
import { type ReadLine } from './index';

export async function compile(
  readLine: ReadLine,
  environment?: Environment,
): Promise<{ result: any, environment: Environment }> {
  const { tokens } = await scan(readLine);
  const globalScope: Environment = environment ?? { outerScope: null };
  const { statements } = parse({
    tokens,
  });

  const result = statements.reduce((_, statement) => {
    return statement.evaluate(globalScope);
  }, undefined);

  return {
    result,
    environment: globalScope
  };
}
