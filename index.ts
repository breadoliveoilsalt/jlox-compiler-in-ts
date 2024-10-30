import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { compile } from './compiler';
import { type Environment } from './parser';
import { CompilerError } from './errors';

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
  console.log(`\n----- Evaluating file ${filePath} -----\n`);
  const reader = await fileLineReader({ filePath });
  const readLine = reader!.readLine as ReadLine;

  await compile({ readLine });
}

async function startRepl() {
  console.log('\n----- Starting jlox repl -----');
  console.log('----- Type "exit" to end -----\n');
  const rl = readline.createInterface({ input, output });

  rl.on('close', () => {
    process.exit();
  });

  async function runRepl(env?: Environment) {
    console.log('runrepl: env at start of runRepl', env)
    const line = await rl.question('> ');

    if (line === 'exit') {
      console.log('\n----- Goodbye! -----\n');
      rl.close();
    }

    const lines = [line, false];

    async function readLine() {
      if (lines.length === 0) return Promise.resolve(false);
      return Promise.resolve(lines.shift());
    }

    const globalScope: Environment = env ?? { outterScope: null };
    console.log('runrepl: globalScope set', globalScope)
    let updatedGlobalScope: Environment;

    try {
      const args = {
        readLine,
        environment: globalScope,
      } as { readLine: ReadLine; environment: Environment };
      const { result, environment } = await compile(args);
      console.log('runrepl: environment after compile', environment);
      updatedGlobalScope = environment;
      console.log('runrepl: updatedGlobalScope after compile', updatedGlobalScope);
      await runRepl(updatedGlobalScope);
      console.log(result);
    } catch (e: unknown) {
      if (e instanceof CompilerError) {
        const { name, message, lineNumber } = e;
        console.log(`${name}: Line ${lineNumber}: ${message}`);
      } else {
        rl.close();
        console.log('Error unrecognized by jlox\n');
        throw e;
      }
    }

    console.log('updatedGlobalScope outside', updatedGlobalScope);
  }

  await runRepl();
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
