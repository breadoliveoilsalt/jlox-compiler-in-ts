import { describe, test } from 'vitest';
import { testCompiler } from './testHelpers';

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
