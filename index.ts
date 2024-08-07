import { open } from 'node:fs/promises';
import { scan } from './scanner';

async function main() {
  try {
    console.log('\n----- compiling -----\n');
    const fileHandle = await open('./src.jlox');

    const readline = fileHandle.readLines;

    scan({ readline })

    // for await (const line of fileHandle.readLines()) {
    //   console.log(line);
    // }
  } catch (e) {
    console.log(e);
  }
}

main()
