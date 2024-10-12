import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  // Using `reduce` below does not work because
  // some statements do not return anything to be passed
  // along to the accumulator, e.g., `var thing = 2 * 8;`
  // return parsedResults.reduce((statement) => {
  //   console.log('statement inside reduce', statement)
  //   return statement.evaluate()
  // })
  //
  // TODO: solve for how to deal with repl and seeing value
  // after entering something.
  return parsedResults.forEach((statement) => statement.evaluate())
}
