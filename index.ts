import * as fs from 'node:fs';
import { type ReadLine, scan } from './scanner';
import { parse } from './parser';

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

async function main() {
  console.log('\n----- compiling -----\n');
  const reader = await initLineReader({ filePath: './src.jlox' });
  const readLine = reader!.readLine as ReadLine;

  const { tokens } = await scan(readLine);
  const parsedResults = parse(tokens)
  if (parsedResults?.ast) {
    const result = parsedResults.ast.evaluate()
    console.log(result)
  }


  // console.log('ast', ast)
  // console.log('left', ast.left.interpret())
  // console.log("right", ast.right.interpret())

}

main();
