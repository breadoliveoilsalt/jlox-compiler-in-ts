import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from './compiler';
import * as outputModule from './systemPrint';

describe('control flow', () => {

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('if/else blocks', () => {
    test('when the if condition is true, the if statement is evaluated instead of the else statement', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (12 == 12) {',
        'print 5;',
        ' } else {',
        ' print  10;',
        '}',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[5]]);
    });

    test('when the if condition is false, the else statement is evaluated instead of the else statement', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (56 == 12) {',
        'print 5;',
        ' } else {',
        ' print  10;',
        '}',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[10]]);
    });

    test('when the if condition is true and there is no else statement, the if statement is evaluated', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (12 == 12) {',
        'print 5;',
        ' }',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[5]]);
    });


    test('when the if condition is false and there is no else statement, the if statement is not evaluated', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (true == false) {',
        'print 5;',
        ' }',
        'print 7;',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[7]]);
    });

  });


});
