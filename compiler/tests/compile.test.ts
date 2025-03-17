import { describe, test, expect } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from '..';

async function testCompiler({ line, expected }) {
  const readLine = buildReadLine([line]);

  const { result } = await compile(readLine);

  expect(result).toEqual(expected);
}

describe('boolean expressions', () => {
  test.each([
    {
      line: 'true;',
      expected: true,
    },
    {
      line: 'false;',
      expected: false,
    },
    {
      line: '!true;',
      expected: false,
    },
    {
      line: '!false;',
      expected: true,
    },
    {
      line: '!!false;',
      expected: false,
    },
    {
      line: '!!true;',
      expected: true,
    },
    {
      line: '!!!true;',
      expected: false,
    },
  ])(
    'boolean expressions compile, such as $line',
    async ({ line, expected }) => {
      await testCompiler({ line, expected });
    },
  );
});

describe('equality expressions', () => {
  test.each([
    {
      line: 'true == true;',
      expected: true,
    },
    {
      line: 'false == true;',
      expected: false,
    },
    {
      line: 'true == false;',
      expected: false,
    },
    {
      line: 'false == false;',
      expected: true,
    },
    {
      line: '!false == true;',
      expected: true,
    },
    {
      line: '!true == true;',
      expected: false,
    },
    {
      line: 'true == !false;',
      expected: true,
    },
    {
      line: 'true == !true;',
      expected: false,
    },
  ])(
    'equality expressions compile, such as $line',
    async ({ line, expected }) => {
      await testCompiler({ line, expected });
    },
  );
});

describe('parenthetical expressions', () => {
  test.each([
    {
      line: '(true);',
      expected: true,
    },
    {
      line: '((true));',
      expected: true,
    },
    {
      line: '(!true);',
      expected: false,
    },
    {
      line: '((!true));',
      expected: false,
    },
    {
      line: '(false);',
      expected: false,
    },
    {
      line: '(!false);',
      expected: true,
    },
    {
      line: '(false == true);',
      expected: false,
    },
    {
      line: '(!false == true);',
      expected: true,
    },
    {
      line: '(!false) == (true);',
      expected: true,
    },
    {
      line: '(false == true) == (true == false);',
      expected: true,
    },
    {
      line: '(false == true) != (true == true);',
      expected: true,
    },
    {
      line: '(true) == (false != true);',
      expected: true,
    },
    {
      line: '((!true)) != (false != true);',
      expected: true,
    },
    {
      line: '!(!true);',
      expected: true,
    },
    {
      line: '!(!true == false);',
      expected: false,
    },
  ])(
    'parenthetical expressions compile, such as $line',
    async ({ line, expected }) => {
      await testCompiler({ line, expected });
    },
  );
});

describe('doing math', () => {
  test.each([
    {
      line: '24 + 31;',
      expected: 55,
    },
    {
      line: '33 - 21;',
      expected: 12,
    },
    {
      line: '33 / 11;',
      expected: 3,
    },
    {
      line: '44 * 3;',
      expected: 132,
    },
    {
      line: '2 * 3 + 2;',
      expected: 8,
    },
    {
      line: '2 * (3 + 2);',
      expected: 10,
    },
    {
      line: '(2 * (3 + 2)) * 3;',
      expected: 30,
    },
    {
      line: '-13 + -7;',
      expected: -20,
    },
    {
      line: '-13 + 5;',
      expected: -8,
    },
    {
      line: '33.11 + 23;',
      expected: 56.11,
    },
    {
      line: '10.11 - 0.11;',
      expected: 10,
    },
    {
      line: '10 - 21;',
      expected: -11,
    },
  ])(
    'term and factor expressions compile, such as $line',
    async ({ line, expected }) => {
      await testCompiler({ line, expected });
    },
  );
});

describe('global variables', () => {
  test('it permits the declaration of global variables', () => {
    testCompiler({ line: 'var thing = true;', expected: null });
  });

  test('initialized global variable are assigned a value', () => {
    testCompiler({ line: 'var thing = 14 + 2; thing;', expected: 16 });
  });

  test('initialized global variable can be reassigned (one line)', () => {
    testCompiler({
      line: 'var thing = 14 + 2; thing = 17; thing;',
      expected: 17,
    });
  });

  test('initialized global variable can be reassigned (multiline)', async () => {
    const lines = ['var thing = 14;', 'thing = 15;', 'thing;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(15);
  });

  test('initialized global variable can be evaluated with other expressions', () => {
    testCompiler({ line: 'var thing = 14 + 2; thing + 3;', expected: 19 });
  });

  test('initialized global variables can be evaluated with other expressions (multiline)', async () => {
    const lines = ['var thing = 14;', 'thing + 15;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(29);
  });

  test('assigning a variable a value without initialization throws an error', async () => {
    try {
      const lines = ['thing = 14;'];
      const readLine = buildReadLine(lines);

      await compile(readLine);
    } catch (e) {
      expect(e.message).toEqual('Undefined variable (identifier): "thing"');
    }
  });

  test.each([[['var thing = 15']]])(
    'when initializing or assigning a variable, forgetting a semicolon results in an error',
    async (lines) => {
      try {
        const readLine = buildReadLine(lines);

        await compile(readLine);
      } catch (e) {
        expect(e.message).toEqual(
          'Syntax Error. Did you forget a semicolon ";" after variable declaration?',
        );
      }
    },
  );

  test.each([[['var thing = 15;', 'thing = 16']], [['true']], [['3 + 4']]])(
    'forgetting a semicolon results in an error',
    async (lines) => {
      try {
        const readLine = buildReadLine(lines);

        await compile(readLine);
      } catch (e) {
        expect(e.message).toEqual('Missing semicolon ";" after expression');
      }
    },
  );

  test('a declared but uninitialized variable compiles to nil', async () => {
    const lines = ['var thing;', 'thing;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual('nil');
  });

  test('a declared but uninitialized variable can be assigned a value', async () => {
    const lines = ['var thing;', 'thing = 24 / 4; thing;'];

    const readLine = buildReadLine(lines);

    const { result } = await compile(readLine);

    expect(result).toEqual(6);
  });

  test.each([[['var thing;', 'thing + 16;']], [['var thing;', '2 - thing; ']]])(
    'addition or subtraction with a nil value results in an error',
    async (lines) => {
      try {
        const readLine = buildReadLine(lines);

        await compile(readLine);
      } catch (e) {
        expect(e.message).toContain('Cannot evaluate');
        expect(e.message).toContain('with a nil value');
      }
    },
  );

  test.each([[['var thing;', 'thing / 16;']], [['var thing;', '2 * thing; ']]])(
    'multiplcation or division with a nil value results in an error',
    async (lines) => {
      try {
        const readLine = buildReadLine(lines);

        await compile(readLine);
      } catch (e) {
        expect(e.message).toContain('Cannot evaluate');
        expect(e.message).toContain('with a nil value');
      }
    },
  );
});
