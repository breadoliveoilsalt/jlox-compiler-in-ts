import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from './compiler';
import * as outputModule from './systemPrint';

describe('function declarations and calls', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('functions with no parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = ['fun printFive() {', 'print 5;', '}', 'printFive();'];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[5]]);
  });

  test('functions with one parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = ['fun addFive(num) {', 'print 5 + num;', '}', 'addFive(3);'];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[8]]);
  });

  test('functions with two parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = ['fun add(a, b) {', 'print a + b;', '}', 'add(7, 10);'];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[17]]);
  });
});
