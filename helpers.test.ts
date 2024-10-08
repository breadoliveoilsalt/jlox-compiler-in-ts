import { describe, test, expect } from 'vitest';
import { sequencer } from './helpers';
import {
  type Tokens,
  TOKEN_NAMES,
} from './scanner';

describe('sequencer', () => {
  test('it confirms that a token sequence exists', () => {
    const tokens: Tokens = [
      {
        name: TOKEN_NAMES.VAR,
        text: 'var',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.IDENTIFIER,
        text: 'thing',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.EQUAL,
        text: '=',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.NUMBER,
        text: '15',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.SEMICOLON,
        text: ';',
        lineNumber: 1,
      },
    ];

    const currentTokenHead = 1;

    const expectedTokens = [
      {
        name: TOKEN_NAMES.IDENTIFIER,
      },
      {
        name: TOKEN_NAMES.EQUAL,
      },
      {
        name: TOKEN_NAMES.NUMBER,
      },
      {
        name: TOKEN_NAMES.SEMICOLON,
      },
    ];

    const { assertTokenSequence } = sequencer();

    expect(
      assertTokenSequence({ tokens, currentTokenHead, expectedTokens }),
    ).toEqual(true);
  });

  test.only('it confirms that a token sequence does not exist', () => {
    const tokens: Tokens = [
      {
        name: TOKEN_NAMES.VAR,
        text: 'var',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.IDENTIFIER,
        text: 'thing',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.EQUAL,
        text: '=',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.NUMBER,
        text: '15',
        lineNumber: 1,
      },
      {
        name: TOKEN_NAMES.SEMICOLON,
        text: ';',
        lineNumber: 1,
      },
    ];

    const currentTokenHead = 2;

    const expectedTokens = [
      {
        name: TOKEN_NAMES.EQUAL,
      },
      {
        name: TOKEN_NAMES.BANG,
      },
      {
        name: TOKEN_NAMES.SEMICOLON,
      },
    ];

    const { assertTokenSequence } = sequencer();

    expect(
      assertTokenSequence({ tokens, currentTokenHead, expectedTokens }),
    ).toEqual(false);
  });
});
