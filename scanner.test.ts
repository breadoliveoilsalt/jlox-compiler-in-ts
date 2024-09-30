import { describe, test, expect } from 'vitest';
import { scan } from './scanner';
import { type ReadLine } from '.';

describe('scan', () => {
  test('given a string of lexemes, it returns tokens with line numbers and an EOF token', async () => {
    const lines = ['(!true) == (false != false)', 'true == !!true', false]
    async function readLine() { return lines.shift() }

    const { tokens } = await scan(readLine as ReadLine)

    const expectedTokens = [
      { name: 'leftParen', text: '(', lineNumber: 1 },
      { name: 'bang', text: '!', lineNumber: 1 },
      { name: 'true', text: 'true', lineNumber: 1 },
      { name: 'rightParen', text: ')', lineNumber: 1 },
      { name: 'equalEqual', text: '==', lineNumber: 1 },
      { name: 'leftParen', text: '(', lineNumber: 1 },
      { name: 'false', text: 'false', lineNumber: 1 },
      { name: 'bangEqual', text: '!=', lineNumber: 1 },
      { name: 'false', text: 'false', lineNumber: 1 },
      { name: 'rightParen', text: ')', lineNumber: 1 },
      { name: 'true', text: 'true', lineNumber: 2 },
      { name: 'equalEqual', text: '==', lineNumber: 2 },
      { name: 'bang', text: '!', lineNumber: 2 },
      { name: 'bang', text: '!', lineNumber: 2 },
      { name: 'true', text: 'true', lineNumber : 2 },
      { name: 'eof', text: '', lineNumber: 2 }
    ]

    expect(tokens).toEqual(expectedTokens)
  })

  test('it correctly identifies var and identifier tokens', async () => {
    // TODO: Beef up this test
    const lines = ['var fiddle_12343423;', false]
    async function readLine() { return lines.shift() }

    const { tokens } = await scan(readLine as ReadLine)

    const expectedTokens = [
      { name: 'var', text: 'var', lineNumber: 1 },
      { name: 'identifier', text: 'fiddle_12343423', lineNumber: 1 },
      { name: 'semicolon', text: ';', lineNumber: 1 },
      { name: 'eof', text: '', lineNumber: 1 }
    ]

    expect(tokens).toEqual(expectedTokens)
  })
})
