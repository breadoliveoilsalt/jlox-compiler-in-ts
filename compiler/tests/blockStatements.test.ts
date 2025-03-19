import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from '..';
import * as outputModule from '../../systemPrint';

describe('compiling block statements', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('block statements have an inner scope', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      'var thing = 15;',
      '{',
      'var thing = 21;',
      'print thing;',
      '}',
      'print thing;',
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);

    expect(printSpy.mock.calls).toEqual([[21], [15]]);
  });

  test('inner blocks can work with variables', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      'var thing = 10;',
      '{',
      'var thing = 12;',
      '{',
      'print thing + 3;',
      '}',
      'print thing / 4;',
      '}',
      'print thing * 30;',
    ];
    const readLine = buildReadLine(lines);
    await compile(readLine);

    expect(printSpy.mock.calls).toEqual([[15], [3], [300]]);
  });
});
