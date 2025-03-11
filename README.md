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

## Next steps (TODOs)

- [ ] Refactor environment binding to fix bug where multiple recursion calls
  bind incorrect values to parameters.
- [ ] Refactor tests, breaking integration tests into different files for
  expressions, variables, etc.
- [ ] Refactor AST node builders, breaking the `parse.ts` file into different
  files.
- [ ] When there are a recursive function like `buildArguments` or `buildBlock`, be
  consistent about whether it consumes the last brace or token. The trade off is:
  all the other functions consume the last token when evaluating, so there's
  consistence vs the call has to then check that `currentTokenHead - 1` is the
  correct paren or brace, rather than EOF. For example, `buildArgs` does NOT consume the
  right paren, so we have the check here for `currentTokenHead` (above), but have
  to plus one below

## Done
- [X] Chapters 1-7 of [Crafting Interpreters](https://craftinginterpreters.com/):
  Scan for tokens, parse into abstract syntax tree, and evaluate statements.
  - [X] Evaluate booleans, parentheticals, and basic math.
- [X] Get rudimentary repl going.
- [X] Take file as input on command line
- [X] Start repl if no file specified at the command line
- [X] Beef up error handling and error reporting to user for expressions
- [X] Fix linting/prettifying re: adding semi-colons in TS code.
- [X] Add line number to token object
- [X] Chapter 8 of [Crafting Interpreters](https://craftinginterpreters.com/statements-and-state.html): Statements and State
  - [X] Add `print` functionality
  - [X] Add global env and ability to read multiple lines
  - [X] Add scoped envs
  - [X] Add block statements
- [X] Fix Repl
  - [X] it can handle one error and repeats the loop,
        but it forcefully exits after a second error
  - [X] it needs a global env for variables to work
  - [X] print evaluation of expressions to console even if `print`
        not used
- [X] Chapter 9 of [Crafting Interpreters](https://craftinginterpreters.com/control-flow.html):
  Control Flow
- [X] Chapter 10 of [Crafting Interpreters](https://craftinginterpreters.com/functions.html):
  Function

## Open issues / Questions

- To consider:
  - Can I hide knowledge of data structure from parser, etc., with an intermediate
    layer of helper methods?
  - Consider adding cursor position of each lexeme in scanner, for better error
    reporting.

## Wish list

- Add support for commenting-out jlox code
- Multi-line string support
- Multi-line support for repl
- "Panic Mode" and full syntax error reporting in one go

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

- Learning: On adding a repl:
  - A `while` loop does not work for reading line over and over in node. With
    such an approach, node exhibited an odd behavior, repeating each character
    typed, increasing once per loop.
  - Instead, we need this recursive style function seen in the `runRepl` function.
    - See also:
      - https://stackoverflow.com/a/24182269
      - https://stackoverflow.com/a/24466103

- Learning: At some point, I broke my repl - it would crash after two jlox
  syntax errors, rather than handling them gracefully. The problem was I had a
  `try` block surrounding the entire procedure of creating the interface,
  closing the interface, etc.
  - The solution was I needed a more focused scope for the try -- surrounding
    only the call to `compile` and the `console.log` of the result. Once the
    error was caught and handled, then recursively call the function that in
    turn calls `question` on the `readline` instance.

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

#### Extra appreciation of recursion
- I'm proud of realizing that `parse` can be a recursive function and
  implementing it that way.

#### Problems with classic deep clone with JSON.stringify & JSON.parse

- To allow variables to be declared but not initialized, I save them to my env
  object with a value of `undefined`. My `update` method had a `deepClone`
  method to copy the environment to keep things immutable/functional. It used
  `JSON.parse(JSON.stringify(obj))` to accomplish this simply. I learned through
  debugging that this is problematic and will not work here, because
  `JSON.stringify` strips out keys with values of `undefined`! So my declared
  but initialized variables were getting removed when another variable was
  declared and `update` was called again.

```js
> const obj = { outerScope: null, fish: undefined }
undefined
> JSON.stringify(obj)
'{"outerScope":null}'
```

#### It seems the less you wrap in a try/catch block, the better

- I was having all kinds of problems running the repl, particularly displaying
  errors in a meaningful way and keeping the repl loop going without
  crashing when there were errors. There were several problems I encountered,
  but by far the biggest cause was casting too big a net in the `try` of a
  `try/catch` block. The `try` originally had the logic for parsing the tokens,
  printing the result to the repl, re-running the repl loop, etc.
  - Generally speaking, the solution was to wrap just the parsing call in a `try/catch` block that would return an object either the result of parsing or a meaningful error in string form. See `compileForRepl`. Then, the function receiving the result of the user's input could decide what to do with the result or the stringified error. This is a great pattern.

#### For tracking variables, I tried having a non-global environment. That all fell apart when implementing while loops

I tried making this as functional-programmy as possible. Toward this goal, I
passed the environment around from function to function as the AST was built,
and I deep cloned it prior to making any change. The rubber hit the road,
however, when trying to implement `while` loops.

Consider this:

```
var num = 0;

while (num < 10) {
  print num;
  num = num + 1;
}
```

With my original implementation, this would loop forever, usually printing `1`
forever. That's because the variable assignment inside the `while` loop (`num =
num + 1`) would deep clone the original environment *prior* to incrementing
`num`. When the expression condition checked num (`num < 10`), its reference to
the environment containing `num`'s state was the original environment -- a completely different reference.

I pivoted and am no longer deep cloning the environment object. Although (at the
moment) the environment is still being passed from function to function, it
effectively acts as a global environment, one that is constantly being mutated.

An alternative, which would involve some serious refactoring, would be to have a
global environment object that is NOT passed around, existing in the outer
scope of all the builder functions building the AST and accessible by those
builders. Every time the environment is updated, it is cloned beforehand, but
the global environment is assigned this new clone. Thus, all the builders will
still have the latest values. This would be similar to a reducer pattern.

#### Another lesson on the environment for binding variables

Originally, I bound variables to an environment when the AST nodes were built,
NOT when each one was being evaluated (via the `evaluate` call). Working on
the implementation for functions proved that this was a mistake. For example,
argument values have to be bound to parameters at the time functions are called,
not before, otherwise wonky results happen.

This was a relatively quick fix at first: functions seemed to be working,
returning basic values, serving as closures, and performing recursion where the
recursion involved one call. However, when I tried to do a basic a
basic Fibonacci function with two recursive calls, a bigger problem was exposed.

```
fun fib(n) {
  print n;
  if (n <= 1) {
    return n;
  }

  return fib(n - 2) + fib(n - 1);
}

print fib(4);

# Output
4
2
0
-1
-2
-3 # final result
```

The problem is that every time the recursive call happened, the call was
reassigning the value of `n` for every function execution. In other words, the
function block has its own scope, but it only has ONE scope, no matter how many
times the function is recursively called. Instead, each call needs its own new
scope. Currently, I am passing the environment around to each function that
builds an AST node for execution, and each `execute` functions has a pointer to
the environment if needed. But it seems we need to create a new scope at the time
`execute` is called for a function call node. And for that to happen, the
environment has to be passed to the `execute` call of each AST node.

This is my current working theory at least. To fix it will require a large-ish
refactor. My plan is to merge in my function implementation as-is, with a test
pointing out the problem, and pursue the refactor later.

UPDATE: The refactor is complete! It worked to solve the problem with branching
recursive calls, such as `fib()` above. Unfortunately, this broke the functions'
ability to serve as closures. This was fixed by moving where `functionObject`
was created, to right before `evaluate()` in `buildFunction`, to inside
`evaluate()`. The key was realizing that the `functionObject` had to be created
with a nested environment at the time `evaluate()` was called to set the
function object in the current environment. That is, the current environment
would have any necessary variables for the function (such as closures). If
instead, I (erroneously) set the environment for the `functionObject` when
`.call()` was called, those necessary environment variables may not exist!
