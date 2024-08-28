import { describe, test, expect } from 'vitest';
import { compile } from './compiler';

// TODO: Break these down into separate tests so 
// I can isolate them with .only if needed.
describe('compile', () => {
  test.each([
    {
      line: 'true',
      expected: true,
    },
    {
      line: 'false',
      expected: false,
    },
    {
      line: '!true',
      expected: false,
    },
    {
      line: '!false',
      expected: true,
    },
    {
      line: '!!false',
      expected: false,
    },
    {
      line: '!!true',
      expected: true,
    },
    {
      line: '!!!true',
      expected: false,
    },
    {
      line: 'true == true',
      expected: true,
    },
    {
      line: 'false == true',
      expected: false,
    },
    {
      line: 'true == false',
      expected: false,
    },
    {
      line: 'false == false',
      expected: true,
    },
    {
      line: '!false == true',
      expected: true,
    },
    {
      line: '!true == true',
      expected: false,
    },
    {
      line: 'true == !false',
      expected: true,
    },
    {
      line: 'true == !true',
      expected: false,
    },
    {
      line: '(true)',
      expected: true,
    },
    {
      line: '((true))',
      expected: true,
    },
    {
      line: '(!true)',
      expected: false,
    },
    {
      line: '((!true))',
      expected: false,
    },
    {
      line: '(false)',
      expected: false,
    },
    {
      line: '(!false)',
      expected: true,
    },
    {
      line: '(false == true)',
      expected: false,
    },
    {
      line: '(!false == true)',
      expected: true,
    },
    {
      line: '(!false) == (true)',
      expected: true,
    },
    {
      line: '(false == true) == (true == false)',
      expected: true,
    },
    {
      line: '(false == true) != (true == true)',
      expected: true,
    },
    {
      line: '(true) == (false != true)',
      expected: true,
    },
    {
      line: '((!true)) != (false != true)',
      expected: true,
    },
    {
      line: '!(!true)',
      expected: true,
    },
    {
      line: '!(!true == false)',
      expected: false,
    },
  ])(
    'given simple string expressions, it compiles',
    async ({ line, expected }) => {
      async function readLine() {
        return Promise.resolve(line);
      }

      expect(await compile(readLine)).toEqual(expected);
    },
  );
});
