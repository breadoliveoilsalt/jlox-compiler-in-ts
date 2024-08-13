import { describe, test, expect } from 'vitest';
import { compile } from './compiler';


describe('compile', () => {

  test.each([
    {
      line: 'true == true',
      expected: true
    },

    {
      line: 'false == true',
      expected: false
    },
    {
      line: 'true == false',
      expected: false
    },
    {
      line: 'false == false',
      expected: true
    },
  ])('given simple string expressions, it compiles', async ({ line, expected }) => {
    async function readLine() {
      return Promise.resolve(line);
    }

    expect(await compile(readLine)).toEqual(expected);

  })
})
