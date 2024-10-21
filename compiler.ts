import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

// export async function compile(readLine: ReadLine) {
//   const { tokens } = await scan(readLine);
//   const parsedResults = parse({ tokens });
//   parsedResults.forEach((statement) => statement.evaluate())
// }

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  return parsedResults.reduce((_, statement) => {
    return statement.evaluate();
  }, undefined);
}
