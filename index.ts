import * as fs from 'node:fs';
import { scan } from './scanner';
import { parse } from './scanner';

async function initLineReader({ filePath }: { filePath: string }) {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    const data = file.split('\n')

    async function readLine() {
      if (data.length === 0) return Promise.resolve(false)
      return Promise.resolve(data.shift())
    }

    return {
      readLine
    }
  } catch (e) {
    console.log(e)
  }
}

type ReadLine = () => Promise<string>;

async function main() {
  console.log('\n----- compiling -----\n');
  const { readLine } = await initLineReader({ filePath: './src.jlox' });
  const { tokens } = await scan({ readLine });
  const { ast } = parse({ tokens })

  // console.log(ast)
  const result = ast.interpret()
  console.log(result)

}

main();
