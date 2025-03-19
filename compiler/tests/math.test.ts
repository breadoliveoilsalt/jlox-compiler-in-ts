import { describe, test } from 'vitest';
import { testCompiler } from './testHelpers';

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
