import { describe, test, expect } from 'vitest';
import addFive from './index';

describe('addFive', () => {
  test('it adds 5', () => {
    expect(addFive(3)).toEqual(8)
  });
});

