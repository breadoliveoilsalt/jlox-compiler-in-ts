import { describe, test, expect } from 'vitest';
import { buildReadLine, testCompiler } from './testHelpers';
import { compile } from '..';

describe('globally scoped variables', () => {
  test('it permits the declaration of globally scoped variables', () => {
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
      e instanceof Error &&
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
        e instanceof Error &&
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
        e instanceof Error &&
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
        e instanceof Error && expect(e.message).toContain('Cannot evaluate');
        e instanceof Error && expect(e.message).toContain('with a nil value');
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
        e instanceof Error && expect(e.message).toContain('Cannot evaluate');
        e instanceof Error && expect(e.message).toContain('with a nil value');
      }
    },
  );
});
