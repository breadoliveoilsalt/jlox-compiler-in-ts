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

    test('variable assignments inside a falsey if statement are not assigned', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'var num = 0;',
        'if (false) {',
        'num = 15;',
        ' }',
        ' print num;',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[0]]);
    });

    test('variable assignments inside a truthy if statement are assigned', async () => {
      const printSpy = vi
        .spyOn(outputModule, 'systemPrint')
        .mockReturnValue(undefined);

      const lines = [
        'var num = 0;',
        'if (true) {',
        'num = 15;',
        ' }',
        ' print num;',
      ];

      const readLine = buildReadLine(lines);

      await compile(readLine);
      expect(printSpy.mock.calls).toEqual([[15]]);
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
  ])(
    'it handles complex combinations of its use',
    async ({ line, expectedResult }) => {
      const readLine = buildReadLine([line]);

      const { result } = await compile(readLine);

      expect(result).toEqual(expectedResult);
    },
  );
});

describe("logical operator 'and'", () => {
  test('it short-circuits', async () => {
    const lines = ['false and 3;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(false);
  });

  test('returns the right expression if the left expression if true', async () => {
    const lines = ['true and 3;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(3);
  });

  test.each([
    {
      line: '(true == true) and 7;',
      expectedResult: 7,
    },
    {
      line: '9 and false and false and false;',
      expectedResult: false,
    },
    {
      line: '9 and true and true and 4;',
      expectedResult: 4,
    },
    {
      line: 'true and (false == false) and (7 == 7) and 15;',
      expectedResult: 15,
    },
  ])(
    'it handles complex combinations of its use',
    async ({ line, expectedResult }) => {
      const readLine = buildReadLine([line]);

      const { result } = await compile(readLine);

      expect(result).toEqual(expectedResult);
    },
  );
});

describe('while loops', () => {
  test('while loops work', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      'var num = 0;',
      'while (num < 4) {',
      ' print num;',
      'num = num + 1;',
      '}',
      'print "exit while loop";',
      'print num;',
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);

    expect(printSpy.mock.calls).toEqual([
      [0],
      [1],
      [2],
      [3],
      ['"exit while loop"'],
      [4],
    ]);
  });
});

describe('for loops', () => {
  test('classic "for loops" work', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      'for (var i = 0; i < 6; i = i + 1) {',
      '  print i;',
      '}'
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);

    expect(printSpy.mock.calls).toEqual([
      [0],
      [1],
      [2],
      [3],
      [4],
      [5],
    ]);
  });

  test('an initializer is not required in the "for loops" parenthesis', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      'var i = 0;',
      'for (; i < 4; i = i + 1) {',
      '  print i;',
      '}'
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);

    expect(printSpy.mock.calls).toEqual([
      [0],
      [1],
      [2],
      [3],
    ]);
  });
});

describe('controlFlow integration', () => {
  test.each([
    {
      line: '(true and true) or 7;',
      expectedResult: true,
    },
    {
      line: '(3 and false) or 16;',
      expectedResult: 16,
    },
    {
      line: '(true and false) and false;',
      expectedResult: false,
    },
    {
      line: '11 or (false or false);',
      expectedResult: 11,
    },
  ])(
    'logical "and" and logical "or" integrate',
    async ({ line, expectedResult }) => {
      const readLine = buildReadLine([line]);

      const { result } = await compile(readLine);

      expect(result).toEqual(expectedResult);
    },
  );
});
