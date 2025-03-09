import { afterEach, describe, test, expect, vi } from 'vitest';
import { buildReadLine } from './testHelpers';
import { compile } from './compiler';
import * as outputModule from './systemPrint';

describe('function declarations and calls', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('functions with no parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun printFive() {
        print 5;
      }
      printFive();
      `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[5]]);
  });

  test('functions with one parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun addFive(num) {
        print 5 + num;
      }
      addFive(3);
      `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[8]]);
  });

  test('functions with two parameters can be declared and called', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun add(a, b) {
        print a + b;
       }
       add(7, 10);
     `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[17]]);
  });

  test('functions can return values', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun add5(num) {
        return num + 5;
      }
      var result = add5(6);
      print result;
    `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[11]]);
  });

  test('functions can return values', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun add5(num) {
        return num + 5;
      }
      var result = add5(6);
      print result;
    `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[11]]);
  });

  test('functions have their own scope', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun scopeTest(num) {
        print num;
        var num = 7;
        print num;
      }
      scopeTest(5);
    `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[5], [7]]);
  });

  test('functions without a return value return nil', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun add5(num) {
        print num + 5;
      }
      var result = add5(6);
      print result;
    `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([[11], ['nil']]);
  });

  test('functions with a plain return statement return nil', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
      fun testPlainReturn() {
        return;
      }
      var result = testPlainReturn();
      print result;
    `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([['nil']]);
  });

  test('recursion works', async () => {
    const printSpy = vi
      .spyOn(outputModule, 'systemPrint')
      .mockReturnValue(undefined);

    const lines = [
      `
        fun add(a, b) {
          if (a + b > 100) {
            print "overload!";
            return;
          }
          print a + b;
          var newFirst = a + a;
          var newSecond = b + b;
          add(newFirst, newSecond);
        }

        print add(2, 3);
      `,
    ];

    const readLine = buildReadLine(lines);

    await compile(readLine);
    expect(printSpy.mock.calls).toEqual([
      [5],
      [10],
      [20],
      [40],
      [80],
      ['"overload!"'],
      ['nil'],
    ]);
  });
});
