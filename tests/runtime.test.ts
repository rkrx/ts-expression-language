import {Tokenizer} from "../src/tokenizer.ts";
import {terminals, rules} from "../src/definitions.ts";
import {assertEquals, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import {Runtime} from "../src/runtime.ts";
import {Environment} from "../src/runtime/environment.ts";
import {Parser} from "../src/parser.ts";

const macro = (proc: string, vars: object = {}) => {
    const tokens = new Tokenizer(terminals).tokenize(proc);
    //console.log(Tokenizer.render(tokens));
    const ast = new Parser(rules).parse(rules.program.rule, tokens);
    //console.log(Parser.render(ast));
    const env = new Environment();
    env.addFunction('round', Math.round);
    env.addFunction('min', Math.min);
    env.addFunction('add', (...values: number[]) => values.reduce((acc, v) => acc + v, 0));
    env.addFunction('div', (value, divisor) => value / divisor);
    env.addFunction('pow', (value, exponent) => Math.pow(value, exponent));
    return new Runtime(ast).execute(env);
}

Deno.test({
    name: 'runtime boolean operations',
    fn() {
        assertEquals(macro('true'), true);
    }
});

Deno.test({
    name: 'runtime simple math',
    fn() {
        assertEquals(macro('123'), 123);
        assertEquals(macro('1+1+1'), 3);
        assertEquals(macro('2+2*3'), 8);
        assertEquals(macro('2*2+3'), 7);
        assertEquals(macro('2*2+3.5'), 7.5);
        assertEquals(macro('2*2-3'), 1);
        assertEquals(macro('2*2+(-3)'), 1);
        assertEquals(macro('2*2+2*2'), 8);
        assertEquals(macro('2*2+2*2'), 8);
        assertEquals(macro('11%2'), 1);
        assertEquals(macro('11/2'), 5.5);
        assertEquals(macro('2**8'), 256);
        assertEquals(macro('(4+4)*(4+4)'), 64);
    }
});

Deno.test('runtime single function', () => assertEquals(macro('round(5.5)'), 6));
Deno.test('runtime nested functions', () => assertEquals(macro('min(round(5.5), 5)'), 5));
Deno.test('runtime exception when calling unregistered function', () => { assertThrows(() => macro('notregistered(1)'), undefined, 'Function "notregistered" not found') });

Deno.test({
    name: 'runtime pipelines',
    fn() {
        assertEquals(macro('5.5 |> round()'), 6);
        assertEquals(macro('5.5 |> add(2, 3)'), 10.5);
        assertEquals(macro('4 |> add(2) |> div(3)'), 2);
        assertEquals(macro('5.5 |> round() |> div(3) |> pow(8)'), 256);
        assertEquals(macro('1 |> add(1, 1) |> add(3 |> add(4))'), 10);
    }
});
