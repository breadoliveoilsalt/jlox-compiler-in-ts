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
  - `npm run compile:src` evaluates `src.jlox`.
  - Currently TypeScript errors are non-blocking.

## Running tests

- `npm run test`

## Done

- [X] Evaluate statements (up to and including Chapter 7 of Crafting
  Interpreters). This includes booleans, parentheticals, basic math, etc.
- [X] Take file as input on command line
- [X] Start repl if no file specified at the command line

## Next steps (TODOs)

- [ ] Fix Repl
  - [ ] it can handle one error and repeats the loop,
        but it forcefully exits after a second error
  - [ ] it needs a global env for variables to work
  - [ ] print evaluation of expressions to console even if `print`
        not used

- Chapter 8 of [Crafting Interpreters](https://craftinginterpreters.com/): Statements and State
  - [X] Add `print` functionality
  - [X] Add gloabal env and ability to read multiple lines
  - [ ] Add scoped envs
- [X] Beef up error handling and error reporting to user for expressions
- [X] Fix linting/prettifying re: adding semi-colons in TS code.
- [X] Add line number to token object

## Notes on fixing repl [WIP]
- Refactor top level error boundary and `startRepl` so that, say, a jlox syntax
  error does not cause the repl to freeze; the error is reported and the prompt
  re-appears.
    - Note: this does not work: We see a problem we saw earlier, where once the
      repl starts up again, letters that the user types are repeated.

```js
function handleError(e: unknown) {
  if (e instanceof CompilerError) {
    const { name, message, lineNumber } = e;
    console.log(`${name}: Line ${lineNumber}: ${message}`)
  } else {
    console.log('Error unrecognized by jlox\n')
    throw e
  }
}

async function main() {
  const filePath = process.argv[2]
  if (filePath) {
    try {
      await evaluateFile({ filePath })
    } catch (e) {
      handleError(e)
    }
  } else {
    try {
      await startRepl()
    } catch (e) {
      handleError(e)
      startRepl()
    }
  }
}

```

## Open issues / Questions

- To consider:
  - Can I hide knowledge of data structure from parser, etc., with an intermediate
    layer of helper methods?
  - Consider adding cursor position of each lexeme in scanner, for better error
    reporting.

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

- At some point, but my code had a pattern of destructuring all object
  parameters and returning an object with those same keys. That is, the node
  builders would both receive and return an object with the same keys. The
  larger that object grew, the more of a pain it was to maintain this style.
  Every time a new key was added to this object, I had to update each builder
  signature and return value. In other words, because I had decided early on to
  destructure in each builder's signature, any additional argument created
  massive updates to the code. There were many builders.
  -  I'm considering moving away from such a pattern and instead having each
     builder function accept a `context` object that is not destructured and
     then return an update `context` argument.

#### Bugs I've Caused

- As of Chapter 7 (evaluating expressions), my biggest source of bugs has been
  failures to properly increment the `currentTokenHead` at the end of functions
  building nodes for the abstract syntax tree. It has taken some time to get
  this straight in my head, particularly when a node builder evaluates both a
  left and right expression. But chasing down and fixing these bugs has been
  very instructive.

- In chapter 8 (adding the environment for binding variables to values and
  adding scope), solving bugs reminded me that updating the environment has to
  be done outside of a node's `evaluate` function. That is, the node build has
  to update the env, not the node itself.

#### Compiling with TypeScript in Node

- The strategy of transpiling TypeScript using `tsc` and then running node on the
  emitted JavaScript makes it hard to debug: errors are reported on lines in
  the compressed output files, which do not correspond to the lines in the
  source TypeScript files. See
  [here](https://nodejs.org/en/learn/typescript/transpile) for this strategy.
- In addition, using this strategy, I began to see an odd
  `ERR_MODULE_NOT_FOUND` error in the built files when I added `"target": "es6"`
  and `"target": "es2022"` to `tsconfig.json`.
    - I did this trying to solve why `instanceof` would work with a custom
      Error. See [here](https://github.com/microsoft/TypeScript/issues/22585),
      for TypeScript issue and
        [here](https://stackoverflow.com/questions/41719162/instanceof-custom-error-class-returning-false)
        for an example of a Stack Overflow discussion.
- Decision:
  - Walk away from executing the code by transpiling into common JS and running
    `node` on the emitted files. As an alternative, first I tried `ts-node` to
    execute the TypeScript files directly. It did not work; see
    [here](https://github.com/TypeStrong/ts-node/issues/2086) for issues seen.
  - I switched to `tsx` instead. Seems to be working well.
  - Consider: can I use Vite instead? Any benefits?

#### Establishing an error boundary where there is async code
- We can have a top-level catch block as an error boundary, but if the nested
  functions employ asynchronous code and we forget an await, the error boundary
  will NOT catch the error. Instead, the code will run, including the "evaluation"
  of the error boundary, and the error in the async code will be thrown AFTER
  the evaluation. So it will look like our error boundary is failing to catch
  the error.
  - See [here](https://stackoverflow.com/questions/59716534/try-catch-issues-with-nested-functons-in-javascript) for a description.


#### The order of following grammar rules and recursive descent
- Just because this is a "recursive descent" grammar, it does not mean that the
  grammar rules are evaluated strictly from top to bottom. Nor does it mean that
  when you get to the bottom and have a parenthetical, that you must jump to the
  very top of the grammar.
  - Failing to recognize this caused a number of bugs along the way.
  - Examples of how the grammar can jump around, not go strictly in one
    direction and then loop:
    - For example, `statement` is the top grammar rule. Building a `parenthetical`
      node is one of the last. BUT parenthetical jumps to `buildExpression`, not
      `buildStatement`. In other words, to evaluate what is inside parentheses, we
      jump to a rule somewhere in the middle of the grammar.
    - On a similar theme of not going strictly in one direction, note that
      `buildStatement` jumps *over* `buildExpressionStatement`, going straight to
      `buildExpression`, if the condition for an expression token is met. 

#### Recursion can be cool
- I'm proud of realizing that `parse` can be a recursive function and
  implementing it that way.
