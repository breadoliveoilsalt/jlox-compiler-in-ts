import * as fs from 'node:fs';
import * as readline from 'node:readline/promises';
import { compile } from './compiler';
import { stdin as input, stdout as output } from 'node:process';


async function fileLineReader({ filePath }: { filePath: string }) {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    const data = file.split('\n')

    return {
      readLine: () => {
        if (data.length === 0) return Promise.resolve(false)
        return Promise.resolve(data.shift())
      }
    }
  } catch (e) {
    console.log(e)
  }
}

export type ReadLine = () => Promise<string>;

async function evaluateFile({ filePath }: { filePath: string }) {
  console.log(`\n----- Evaluating file ${filePath} -----\n`);
  const reader = await fileLineReader({ filePath });
  const readLine = reader!.readLine as ReadLine;

  const result = await compile(readLine)

  if (result) console.log(result)
}

async function startRepl() {
  console.log('\n----- Starting jlox repl -----')
  console.log('----- Type \"exit\" to end -----\n')
  const rl = readline.createInterface({ input, output });

  rl.on('close', () => {
    process.exit()
  });

  async function readLine() {
    const line = await rl.question('> ');
    if (line === 'exit') {
      console.log('\n----- Goodbye! -----\n')
      rl.close();
    }

    return line;
  }

  // LEARNING: While loop not work for reading line over and over.
  // With such an approach, node exhibited an odd behavior, repeating
  // each character typed, increasing once per loop. 
  // Instead need this recursive style function. See:
  // https://stackoverflow.com/a/24182269
  // https://stackoverflow.com/a/24466103
  async function runRepl() {
    await compile(readLine as ReadLine)
    await runRepl()
  }

  await runRepl()

}

async function main() {
  const filePath = process.argv[2]
  if (filePath) {
    evaluateFile({ filePath })
  } else {
    await startRepl()
  }
}

main();
