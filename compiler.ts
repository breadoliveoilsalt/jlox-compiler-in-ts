import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

// UPTO - I think I need to return
// parsedResult and env, and pass in env 
// optionally for repl
export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  return parsedResults.reduce((_, statement) => {
    return statement.evaluate();
  }, undefined);
}
