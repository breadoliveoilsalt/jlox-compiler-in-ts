import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  // TODO: Fix -- this is hack until I secure
  // multiline parsing with vars etc.
  return parsedResults[0].evaluate();
  // return parsedResults.reduce((statement) => statement.evaluate())
  // parsedResults.forEach((statement) => statement.evaluate())
  // UPTO HERE: ADD EFFOR IF LENGTH = 0?
  // OR IS THAT BAD FOR REPL
  // NEXT UP: iternate over parsed results
  // and call evalute on each
  // if (parsedResults?.ast) {
  //   return parsedResults.ast.evaluate();
  // }
}
