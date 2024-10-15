import { describe, test, expect } from 'vitest';
import { sequencer, envHelpers } from './helpers';
import { type Tokens, TOKEN_NAMES } from './scanner';

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

  test('it confirms that a token sequence does not exist', () => {
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

  test('it confirms that a token sequence exists when a token is negated', () => {
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

    const { assertTokenSequence, not } = sequencer();

    const expectedTokens = [
      {
        name: TOKEN_NAMES.IDENTIFIER,
      },
      {
        name: TOKEN_NAMES.EQUAL,
      },
      not({
        name: TOKEN_NAMES.BANG,
      }),
      {
        name: TOKEN_NAMES.SEMICOLON,
      },
    ];

    expect(
      assertTokenSequence({ tokens, currentTokenHead, expectedTokens }),
    ).toEqual(true);
  });

  test('it confirms that a token sequence does not exist when a token is negated', () => {
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
        name: TOKEN_NAMES.BANG,
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

    const { assertTokenSequence, not } = sequencer();

    const expectedTokens = [
      {
        name: TOKEN_NAMES.IDENTIFIER,
      },
      {
        name: TOKEN_NAMES.EQUAL,
      },
      not({
        name: TOKEN_NAMES.BANG,
      }),
      {
        name: TOKEN_NAMES.SEMICOLON,
      },
    ];

    expect(
      assertTokenSequence({ tokens, currentTokenHead, expectedTokens }),
    ).toEqual(false);
  });

  test('it passes an example that tripped me up earlier', () => {
    const tokens: Tokens = [
      { name: 'var', text: 'var', lineNumber: 1 },
      { name: 'identifier', text: 'thing', lineNumber: 1 },
      { name: 'semicolon', text: ';', lineNumber: 1 },
      { name: 'eof', text: '', lineNumber: 2 },
    ];
    const currentTokenHead = 0;

    const { assertTokenSequence, not } = sequencer();

    const expectedTokens = [
      { name: TOKEN_NAMES.VAR },
      { name: TOKEN_NAMES.IDENTIFIER },
      not({ name: TOKEN_NAMES.SEMICOLON }),
    ];

    expect(
      assertTokenSequence({ tokens, currentTokenHead, expectedTokens }),
    ).toEqual(false);
  });
});

describe('envHelpers', () => {
  describe('update', () => {
    test('it returns a new environment with the updated key and value', () => {
      const { update } = envHelpers();

      const env = {
        outterScope: null,
        groceries: ['apples', 'oranges'],
        cost: 24,
      };

      const updatedEnv = update(env, 'cost', 27);

      expect(updatedEnv).toEqual({ ...env, cost: 27 });
      expect(env).not.toBe(updatedEnv);
    });
  });

  describe('get', () => {
    test('it returns a variable value if it exists in the global environment', () => {
      const { get } = envHelpers();

      const env = {
        outterScope: null,
        groceries: ['apples', 'oranges'],
        cost: 24,
      };

      const value = get(env, 'cost');

      expect(value).toEqual(24);
    });

    test('it returns a variable value if it exists in the global environment but not an inner scope', () => {
      const { get } = envHelpers();

      const env = {
        outterScope: {
          outterScope: null,
          groceries: ['apples', 'oranges'],
          cost: 24,
        },
        store: 'Hannaford',
      };

      const value = get(env, 'cost');

      expect(value).toEqual(24);
    });

    test('given a deep inner scope, it returns a variable value if it exists in the global environment but not an inner scope', () => {
      const { get } = envHelpers();

      const env = {
        outterScope: {
          outterScope: {
            outterScope: null,
            groceries: ['apples', 'oranges'],
            cost: 24,
          },
          store: 'Hannaford',
        },
      };

      const value = get(env, 'cost');

      expect(value).toEqual(24);
    });

    test('it returns the inner scope variable value if it exists in the global environment and in the inner scope', () => {
      const { get } = envHelpers();

      const env = {
        outterScope: {
          outterScope: null,
          groceries: ['apples', 'oranges'],
          cost: 24,
        },
        store: 'Hannaford',
        cost: 30,
      };

      const value = get(env, 'cost');

      expect(value).toEqual(30);
    });
  });

  describe('has', () => {
    test('it identifies that a key exists in the global env', () => {
      const { has } = envHelpers();

      const env = {
        outterScope: null,
        groceries: ['apples', 'oranges'],
        cost: 24,
      };

      expect(has(env, 'cost')).toEqual(true);
    });

    test('it identifies that a key does not exists in the global env', () => {
      const { has } = envHelpers();

      const env = {
        outterScope: null,
        groceries: ['apples', 'oranges'],
        cost: 24,
      };

      expect(has(env, 'tax')).toEqual(false);
    });

    test('it identifies that a key exists in the global scope from a deep inner scope', () => {
      const { has } = envHelpers();

      const env = {
        outterScope: {
          outterScope: {
            outterScope: null,
            groceries: ['apples', 'oranges'],
            cost: 24,
          },
          store: 'Hannaford',
        },
      };

      expect(has(env, 'cost')).toEqual(true);
    });

    test('it identifies that a key exists in an inner scope', () => {
      const { has } = envHelpers();

      const env = {
        outterScope: {
          outterScope: {
            outterScope: null,
            groceries: ['apples', 'oranges'],
            cost: 24,
          },
          store: 'Hannaford',
        },
        shopper: 'you',
      };

      expect(has(env, 'shopper')).toEqual(true);
      expect(has(env, 'store')).toEqual(true);
      expect(has(env, 'tax')).toEqual(false);
    });
  });
});
