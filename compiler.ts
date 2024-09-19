import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse(tokens);
  if (parsedResults?.ast) {
    return parsedResults.ast.evaluate();
  }
}
