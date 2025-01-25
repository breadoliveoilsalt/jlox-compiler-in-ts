import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from './compiler';
import * as outputModule from './systemPrint';

describe('control flow and strings', () => {
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
        'print "if block";',
        ' } else {',
        ' print  10;',
        '}',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([['"if block"']]);
    });

    test('when the if condition is false, the else statement is evaluated instead of the else statement', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (56 == 12) {',
        'print 5;',
        ' } else {',
        ' print "else block";',
        '}',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([['"else block"']]);
    });

    test('when the if condition is true and there is no else statement, the if statement is evaluated', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = ['if (12 == 12) {', 'print "if block";', ' }'];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([['"if block"']]);
    });

    test('when the if condition is false and there is no else statement, the if statement is not evaluated', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'if (true == false) {',
        'print 5;',
        ' }',
        'print "if block skipped";',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([['"if block skipped"']]);
    });
  });
});

describe("logical operator 'or'", () => {
  test('it short-circuits', async () => {
    const lines = ['5 or 3;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(5);
  });

  test('returns the right expression if the left expression if false', async () => {
    const lines = ['false or 3;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(3);
  });

  test.each([
    {
      line: '(true == true) or 7;',
      expectedResult: true,
    },
    {
      line: '9 or false or false or false;',
      expectedResult: 9,
    },
    {
      line: 'false or (false == true) or (7 == 3) or 15;',
      expectedResult: 15,
    },
  ])('it handles complex combinations of its use', async ({ line, expectedResult}) => {

    const readLine = buildReadLine([line]);

    const { result } = await compile(readLine);

    expect(result).toEqual(expectedResult);
  });
});

