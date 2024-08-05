import { open } from 'node:fs/promises';

async function main() {
  try {
    console.log('\n----- compiling -----\n');
    const file = await open('./src.jlox');

    for await (const line of file.readLines()) {
      console.log(line);
    }
  } catch (e) {
    console.log(e);
  }
}

main()
