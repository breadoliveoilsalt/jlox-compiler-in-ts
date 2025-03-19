import { testCompiler } from './testHelpers';
import { describe, test } from 'vitest';

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
