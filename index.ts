import * as fs from 'node:fs';
import { compile } from './compiler';

async function initLineReader({ filePath }: { filePath: string }) {
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

async function main() {
  console.log('\n----- compiling -----\n');
  const reader = await initLineReader({ filePath: './src.jlox' });
  const readLine = reader!.readLine as ReadLine;

  return compile(readLine)
}

main();
