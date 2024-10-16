import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  // TODO: solve for how to deal with repl and seeing value
  // after entering something.
  // TODO: I'm going to need to come up with
  // different compile methods for file compiler
  // vs repl compiler. Repl will need to continually
  // pass env to parser
  parsedResults.forEach((statement) => statement.evaluate())
}
