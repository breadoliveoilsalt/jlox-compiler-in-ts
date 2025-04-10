import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { compile } from './compiler';
import { type Environment } from './parser/types';
import { CompilerError } from './errors';
import { systemPrint } from './systemPrint';

async function fileLineReader({ filePath }: { filePath: string }) {
  const file = fs.readFileSync(filePath, 'utf8');
  const data = file.split('\n');

  return {
    readLine: () => {
      if (data.length === 0) return Promise.resolve(false);
      return Promise.resolve(data.shift());
    },
  };
}

export type ReadLine = () => Promise<string | false>;

async function evaluateFile({ filePath }: { filePath: string }) {
  systemPrint(`\n----- Evaluating file ${filePath} -----\n`);
  const reader = await fileLineReader({ filePath });
  const readLine = reader!.readLine as ReadLine;

  await compile(readLine);
}

type CompileForReplResult = Promise<
  | { result: any; environment: Environment; error?: never }
  | { result?: never; environment?: never; error: string }
>;

async function compileForRepl(
  readLine: ReadLine,
  environment: Environment,
): CompileForReplResult {
  try {
    return await compile(readLine, environment);
  } catch (e) {
    if (e instanceof CompilerError) {
      const { name, message, lineNumber } = e;
      return { error: `${name}: Line ${lineNumber}: ${message}` };
    } else {
      if (e instanceof Error) {
        return { error: `Error unrecognized by jlox\n ${e.message}` };
      }
    }
    return { error: 'Error unrecognized b jlox \n' };
  }
}

function log({
  error,
  result,
}: {
  error: string | undefined;
  result: string | undefined;
}) {
  if (error) {
    systemPrint(error);
    return;
  }
  if (result === undefined || result === null) {
    systemPrint('nil');
    return;
  }
  systemPrint(result);
}

async function startRepl() {
  systemPrint('\n----- Starting jlox repl -----');
  systemPrint('----- Type "exit" to end -----\n');
  const rl = readline.createInterface({ input, output });

  rl.on('close', () => {
    process.exit();
  });

  async function runRepl(rl: readline.Interface, environment: Environment) {
    const line = await rl.question('> ');

    if (line === 'exit') {
      systemPrint('\n----- Goodbye! -----\n');
      rl.close();
    }

    const lines = [line, false];

    async function readLine() {
      if (lines.length === 0) return Promise.resolve(false);
      return Promise.resolve(lines.shift());
    }

    const {
      result,
      environment: resultingEnv,
      error,
    } = await compileForRepl(readLine as ReadLine, environment);

    log({ error, result });

    await runRepl(rl, resultingEnv ? resultingEnv : environment);
  }

  // Pass global scope to runRepl on first call
  await runRepl(rl, { outerScope: null });
}

async function main() {
  const filePath = process.argv[2];
  if (filePath) {
    await evaluateFile({ filePath });
  } else {
    await startRepl();
  }
}

main();
