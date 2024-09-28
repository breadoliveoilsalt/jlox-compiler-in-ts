import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const parsedResults = parse({ tokens });
  // NOTE: We are returning results here so that
  // repl can print it out to the console.
  //
  // TODO: Question whether `forEach` is correct, as 
  // statements become more complicated. I wish `reduce`
  // would work, but it doesn't seem to at the moment.
  // return parsedResults.forEach((statement) => statement.evaluate())
  // return parsedResults.reduce((statement) => statement.evaluate())
  //
  // NOTE/TODO: This is a hack; to be figured out after adding 
  // env/scope. Perhaps I need separate `compile` functions 
  // for file compiler and repl compiler, since repl
  // will effectively need its own persistent global env so 
  // variable declarations and function definitions can be 
  // remembered as additional lines are typed.

  // Problem with this: it causes this behavior at the repl:
  // > print 7;
  // 7
  // undefined
  // > 7;
  // 7
  // >

  return parsedResults[0].evaluate();
}
