import { scan } from './scanner';
import { parse } from './parser';
import { type ReadLine } from './index';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const globalScope = { outerScope: null };
  const { statements } = parse({ tokens, environment: globalScope });
  return statements.reduce((_, statement) => {
    return statement.evaluate(globalScope);
  }, undefined);
}

export function buildReadLine(lines: string[]) {
  async function readLine() {
    if (lines.length === 0) return Promise.resolve(false as const);
    const line = lines.shift();
    if (typeof line === 'string') return Promise.resolve(line);
    throw new Error('Test Error: readLine called without string');
  }
  return readLine;
}
