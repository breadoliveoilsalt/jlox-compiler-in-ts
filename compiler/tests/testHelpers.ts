import { scan } from '../../scanner';
import { parse } from '../../parser';
import { type ReadLine } from '../../index';
import { expect } from 'vitest';
import { compile as appCompile } from '../';

export async function compile(readLine: ReadLine) {
  const { tokens } = await scan(readLine);
  const globalScope = { outerScope: null };
  const { statements } = parse({ tokens });
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

export async function testCompiler({
  line,
  expected,
}: {
  line: string;
  expected: boolean | number | null;
}) {
  const readLine = buildReadLine([line]);

  const { result } = await appCompile(readLine);

  expect(result).toEqual(expected);
}
