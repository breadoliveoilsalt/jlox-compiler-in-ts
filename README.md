## Basics

- Node v22.5.0
- `npm ci`
- `npm run compile` (currently TypeScript errors are non-blocking)

## Up next
- Figure out how to evaluate a more complex expression where there is a left and
  a right. Will need to peek, and will to recurse down grammar instaed of
  matching token to builder functions

## TODOs / Questions Inbox

- Take file as input on command line
- If no file provided at command line, start repl
- To consider: Integrate responsibility for keeping track of line numbers to function
  returned by `initLineReader` .
- Add error handling
  - source file not present
  - syntax errors, etc.

## Open Issues

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


## Issues Resoled / Learnings

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

  - Decision: Try to keep function parameters limited to one or two. Avoid object parameters and instead try to enforce consistent variable assignment by having functions return objects to be destructured by function callers.
