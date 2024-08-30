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
    'given simple string $line, it compiles',
    async ({ line, expected }) => {
      async function readLine() {
        return Promise.resolve(line);
      }

      expect(await compile(readLine)).toEqual(expected);
    },
  );

  test.each([
    {
      line: '24 + 31',
      expected: 55,
    },
    {
      line: '33 - 21',
      expected: 12,
    },
    {
      line: '33 / 11',
      expected: 3,
    },
    {
      line: '44 * 3',
      expected: 132,
    },
    {
      line: '2 * 3 + 2',
      expected: 8,
    },
    {
      line: '2 * (3 + 2)',
      expected: 10,
    },
    {
      line: '(2 * (3 + 2)) * 3',
      expected: 30,
    },
    {
      line: '-13 + -7',
      expected: -20,
    },
    {
      line: '-13 + 5',
      expected: -8,
    },
    {
      line: '33.11 + 23',
      expected: 56.11,
    },
    {
      line: '10.11 - 0.11',
      expected: 10,
    },
    {
      line: '10 - 21',
      expected: -11,
    },
  ])('it does basic math, computing $line', async ({ line, expected }) => {
    async function readLine() {
      return Promise.resolve(line);
    }

    expect(await compile(readLine)).toEqual(expected);
  });
});
