## Basics

- Node v22.5.0
- `npm ci`
- `npm run compile` (currently TypeScript errors are non-blocking)

## TODOs / Questions

- To consider: Integrate responsibility for keeping track of line numbers to function
  returned by `initLineReader` .
- Add error handling
  - source file not present
  - syntax errors, etc.
- Add repl

## Issues

- It seems extremely difficult (impossible?) to extract from node a `readLine` function, that
  streams lines from a file, that can then be passed around to other functions
  and called whenever a new line is needed (e.g., tokenizing multi-line
  strings).
  - See, for example, [n-readlines](https://github.com/nacholibre/node-readlines).
    Unfortunately I could not get this package working here.
  - Decision: Load entire file into memory and write the interface I wish I had,
    supplying one line at a time everytime `readLine` is called. Refactor later.
    See `initLineReader`.

- Consider: Will scan be recursive, while using a `readLine` function? How
  much can I adhere to functional programming here, while still getting it done?
