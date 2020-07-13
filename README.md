# ts-expression-language
A small sandbox language for filtering and transforming data

## Status

* This project is in pre-alpha. Most language constructs are not sufficiantly tested and some are not even implemented.
* Error handling is is a very early stage and does not provide any usable information at the moment.

## Some design goals

* The runtime environment is intended to be used by potentially untrustworthy persons to write mini-scripts for filtering and transforming data.
* There are no preconfigured classes/functions/constants. Everything you want to connect to your program you have to include yourself and thus have full control over what you can do with the runtime environment.
* Even though the language is C-like, it should be very easy to learn and versatile.
* Can do simple math out of the box
* Extensible by libraries, that are available for quick enhancement.

## Features

- [x] Fully compatible with Deno
- [x] Fully test-driven

## Language features

- [x] `null`
- [x] Boolean (`true` and `false`)
- [ ] Numbers
  - [x] Integers (`1234`, `-1234`)
  - [x] Floats (`1.23`, `-1.23`)
  - [ ] Exponential-numbers (e.g. 3.14E+3 or 1e-2)
- [ ] Strings
  - [x] Basic strings with escapting (`"Hello \"world\""`, `'Hello \'world\''`)
  - [ ] String interpolation (`"Hello ${who}"`)
  - [ ] String opterations (concatenation, etc)
- [x] Arrays (`[1, 2, 3]`)
- [x] Hashes (`{"a": 123, b: 2.3, c: [1, 2, 3]}`)
- [ ] Boolean operations
  - [ ] Logical Operators (`and` / `&&`, `or` / `||`, `not` / `!`)
  - [ ] Comparison Operators (Equal: `==`, Identical: `===`, Not equal: `!=`, Not identical: `!==`, Less than: `<`, Greater than: `>`, Less than or equal to: `<=`, Greater than or equal to: `>=`)
  - [ ] Matches (`x matches /\d+/`)
  - [ ] Tenary operator (`<bool> ? <what if> : <what if not>`)
- [x] (Very) Basic math
  - [x] Operator precedence
  - [x] Parenthesis
  - [x] Arithmetic Operators (`+`, `-`, `*`, `/`, mod: `%`, pow: `**`)
- [x] Pipe operator (passing a value as the first parameter of a function): `stock |> round(0) |> min(0) |> max(25)`
- [x] Passing in functions
- [ ] Passing in objects
  - [ ] Accessing properties
  - [ ] Calling methods

## How to use it?

```typescript
import {ExpressionLanguage, Environment} from 'https://raw.githubusercontent.com/rkrx/ts-expression-language/master/mod.ts';

const el = new ExpressionLanguage();

const env = new Environment();
env.addFunction('rand', (min: number, max: number) => Math.random() * (max - min) + min);
env.addFunction('min', (actual: number, minimumValue: number) => actual < minimumValue ? minimumValue : actual);
env.addFunction('max', (actual: number, maximumValue: number) => actual > maximumValue ? maximumValue : actual);
env.addFunction('round', (value: number, decimals: number) => Math.round(value));

console.log(el.prepare('rand(-25, 50) |> round() |> min(0) |> max(25)').execute(env));
```

## License

The [MIT License](LICENSE)