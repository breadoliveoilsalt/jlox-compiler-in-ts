import { describe, test } from 'vitest';
import { testCompiler } from './testHelpers';

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
