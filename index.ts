// import { open } from 'node:fs/promises';
// import lineByLine from 'n-readline';
import { scan } from './scanner';
import * as fs from 'node:fs';

async function initLineReader({ filePath }: { filePath: string }) {
  const file = fs.readFileSync(filePath, 'utf8');
  const data = file.split('\n')

  async function readLine() {
    if (data.length === 0) return Promise.resolve(false)
    return Promise.resolve(data.shift())
  }

  return {
    readLine
  }
}
// const lineReader = new reader('./src.jlox');
// console.log(lineReader);
// console.log(lineReader.next())

// const fileHandle = await open('./src.jlox');
// const readStream = fileHandle.readLines();
// console.log(readStream.prototype)
// console.log('fileHandle', fileHandle)
// console.log('typeof', typeof fileHandle)
// console.log('readline', readStream)
// console.log('typeof', typeof readStream)

// readStream.question('how is it going?', true, true)
// const thing = readStream.resume();
// console.log('thing', thing)
// readStream.close()

// return async function () {
// const line = await fileHandle.readLines();
// console.log('line', line);

// return await line.next();
// return await fileHandle.readLines();
// }; // return async function () {
//   console.log('first');
//   return Promise.resolve('yo');
// };

async function main() {
  console.log('\n----- compiling -----\n');
  const { readLine } = await initLineReader({ filePath: './src.jlox' });
  const line = await readLine()
  console.log(line)
  console.log(await readLine())
  // console.log(readline());
  // scan({ readline });
}
// async function main() {
//   try {
//     console.log('\n----- compiling -----\n');
//     // const fileHandle = await open('./src.jlox');
//     // const { readLines } = await open('./src.jlox');

//     const readline = fileHandle.readLines;

//     // scan({ readline: readlines })
//     scan({ readline });

//     // for await (const line of fileHandle.readLines()) {
//     //   console.log(line);
//     // }
//   } catch (e) {
//     console.log(e);
//   }
// }

main();
