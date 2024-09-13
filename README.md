## Intro

This is a just-in-time compiler based off the book [Crafting
Interpreters](https://craftinginterpreters.com/) by Robert Nystrom. The book is
fantastic and I'm grateful the author wrote it. To teach about the implementation
of compilers and interpreters, he systematically walks through the grammar and
implementation of a language he invented, `jlox`, using a compiler written in
Java.

Here I'm striving to implement `jlox`, but with a few key differences:

- 1) Write the compiler in TypeScript instead of Java
- 2) Take a more functional-programming approach, rather than an object-oriented
  approach.

I'm also attempting to document next steps and learnings along the way, in the
relevant sections below.

## Running the compiler

- Node v22.5.0
- `npm ci`
- To start a repl:
  - `npm run compile`
- To evaluate a file:
  - `npm run compile -- <file path>`
  - Example: `npm run compile -- ./src.jlox`
    - This will read the `jlox` written in `src.jlox` and print the result to the terminal.
  - Currently TypeScript errors are non-blocking.

## Running tests

- `npm run test`

## Done

- [X] Evaluate statements (up to and including Chapter 7 of Crafting
  Interpreters). This includes booleans, parentheticals, basic math, etc.
- [X] Take file as input on command line
- [X] Start repl if no file specified at the command line

## Next steps (TODOs)

- Chapter 8 of [Crafting Interpreters](https://craftinginterpreters.com/):
  Statements and State 
- Add ability to read multiple lines
- Beef up error handling and error reporting to user for expressions
  - source file not present
  - syntax errors, etc.
- Add line number to token object (perhaps starting position (cursor) of lexeme
  on that line)

## Open issues / Questions

- To consider:
  - Integrate responsibility for keeping track of line numbers to function
    returned by `initLineReader`, or in the tokenizer?.
  - Will scan be recursive, while using a `readLine` function? How
    much can I adhere to functional programming here, while still getting it done?
  - Can I hide knowledge of data structure from parser, etc., with an intermediate
    layer of helper methods?

## Learnings (and how certain issues were resolved)

#### Reading lines of a file with node

- It seems extremely difficult (impossible?) to extract from node a `readLine` function, that
  streams lines from a file, that can then be passed around to other functions
  and called whenever a new line is needed (e.g., tokenizing multi-line
  strings).
  - See, for example, [n-readlines](https://github.com/nacholibre/node-readlines).
    Unfortunately I could not get this package working here.

- Decision: Load entire file into memory and write the interface I wish I had,
  supplying one line at a time every time `readLine` is called. Refactor later.
  See `initLineReader`.

#### Reading lines repeatedly for a repl with node

- On adding a repl:
  - A `while` loop does not work for reading line over and over in node. With
    such an approach, node exhibited an odd behavior, repeating each character
    typed, increasing once per loop. 

- Instead, we need this recursive style function seen in the `runRepl` function. 
  - See also:
    - https://stackoverflow.com/a/24182269
    - https://stackoverflow.com/a/24466103

#### Style: Object Parameters

- I wanted to use object parameters everywhere, seemingly as a way to enforce
  consistent variable assignment. I'm finding, however, that it can make reading
  the code difficult. Compare the readability of the different calls to `matches` below:

```js
function peek({ remainingTokens, offset = 0 }) {
  return remainingTokens[0 + offset]
}

function matches({ token, tokenName }) {
  return token.name === tokenName;
}

if matches({ token: peek({ remainingTokens }), tokenName: TOKEN_NAMES.EQUAL_EQUAL }) {
  // stuff
}

```

vs


```js
function peek(remainingTokens, offset = 0) {
  return remainingTokens[0 + offset]
}

function matches(token, tokenName) {
  return token.name === tokenName;
}

if (matches(peek(remainingTokens), TOKEN_NAMES.EQUAL_EQUAL)) {
//   // stuff
}
```

- Decision: Try to keep function parameters limited to one or two. Avoid
  object parameters and instead try to enforce consistent variable assignment
  by having functions return objects to be destructured by function callers.

#### Bugs I've Caused

- As of Chapter 7 (evaluating expressions), my biggest source of bugs has been
  failures to properly increment the `currentTokenHead` at the end of functions
  building nodes for the abstract syntax tree. It has taken some time to get
  this straight in my head, particularly when a node builder evaluates both a
  left and right expression. But chasing down and fixing these bugs has been
  very instructive.


