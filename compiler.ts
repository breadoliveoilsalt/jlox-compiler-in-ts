import { scan } from './scanner';
import { parse, type Environment } from './parser';
import { type ReadLine } from './index';

// UPTO - I think I need to return
// parsedResult and env, and pass in env
// optionally for repl
export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const globalScope: Environment = { outterScope: null };

  // UPTO HERE:
  //  compiling a file seems to work, although there are TS errors
  //  in the testHelpers file
  //  Have to update compile call when there is a repl and have it pass the env back to compile. The env argument here is optional
  //  Lastly have to update tests
  const { statements, environment} = parse({ tokens, environment: globalScope });
  const result = statements.reduce((_, statement) => {
    return statement.evaluate();
  }, undefined);
  return {
    result,
    environment
  }
}
