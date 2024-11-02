import { scan } from './scanner';
import { parse, type Environment } from './parser';
import { type ReadLine } from './index';

// UPTO - I think I need to return
// parsedResult and env, and pass in env
// optionally for repl
// export async function compile({readLine, env}: {readLine: ReadLine, env?: Environment} ) {
export async function compile(readLine: ReadLine, environment?: Environment) : Promise<{ result: any; environment: Environment}> {
  const { tokens } = await scan(readLine);
  const globalScope: Environment = environment ?? { outterScope: null };
  console.log('compile: global scope set', globalScope);

  // UPTO HERE:
  //  compiling a file seems to work, although there are TS errors
  //  in the testHelpers file
  //  Have to update compile call when there is a repl and have it pass the env back to compile. The env argument here is optional
  //  Lastly have to update tests
  const { statements, environment: envAfterParse } = parse({
    tokens,
    environment: globalScope,
  });

  console.log('in true compile: envAfterParse', envAfterParse)
  const result = statements.reduce((_, statement) => {
    return statement.evaluate();
  }, undefined);
  return {
    result,
    environment: envAfterParse,
  };
}
