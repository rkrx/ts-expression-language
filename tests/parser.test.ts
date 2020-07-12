import {Term, terminals, rules} from "../src/definitions.ts";
import {Tokenizer} from "../src/tokenizer.ts";
import {Parser, t, seq, nt, zeroOrOne, oneOrMore, zeroOrMore} from "../src/parser.ts";
import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

const macro = (proc: string, textRepresentation: string) => {
    const tokens = new Tokenizer(terminals).tokenize(proc);
    const result = new Parser(rules).parse(rules.program.rule, tokens);
    assertEquals(Parser.render(result!), textRepresentation);
};

Deno.test({
    name: 'parser rules',
    fn() {
        const macro = (proc: string, token: any, expected: any) => {
            const tokens = new Tokenizer(terminals).tokenize(proc);
            const result = new Parser(rules).parse(token, tokens);
            assertEquals(Parser.render(result!), expected);
        }
        macro(
            '[1, 2, 3, 4, 5]',
            seq(t(Term.BracketOpen), zeroOrMore(seq(t(Term.Int), t(Term.Comma))), zeroOrOne(t(Term.Int)), t(Term.BracketClose)),
            '(seq 1 2 3 4 5)'
        );
    }
})

Deno.test({
    name: 'parse null',
    fn() {
        macro('null', 'null');
    }
})

Deno.test({
    name: 'parse bools',
    fn() {
        macro('true', 'true');
        macro('false', 'false');
    }
})

Deno.test({
    name: 'parse integers',
    fn() {
        macro(' 123 ', '123');
        macro(' -123 ', '-123');
    }
})

Deno.test({
    name: 'parse floats',
    fn() {
        macro(' 123.45 ', '123.45');
        macro(' -123.45 ', '-123.45');
    }
})

Deno.test({
    name: 'parse strings',
    fn() {
        macro('"Hello world"', 'Hello world');
        macro("'Hello world'", 'Hello world');
    }
})

Deno.test({
    name: 'parse arrays',
    fn() {
        macro("[true, null, 1, 1.23]", '(array true null 1 1.23)');
        macro("[1, [2, []]]", '(array 1 (array 2 (array )))');
    }
})

Deno.test({
    name: 'parse hashes',
    fn() {
        macro("{a: 123, b: true, c}", '(hash (hashKeyValue a 123) (hashKeyValue b true) (hashKeyValue c))');
        macro("{a: {b: {c}}}", '(hash (hashKeyValue a (hash (hashKeyValue b (hash (hashKeyValue c))))))');
    }
})

Deno.test({
    name: 'parse math expressions',
    fn() {
        macro(' 123 + 45.67 ', '(mathExpression 123 + 45.67)');
        macro(' 123 - 45.67 ', '(mathExpression 123 - 45.67)');
        macro(' 123 * 45.67 ', '(mathExpression 123 * 45.67)');
        macro(' 123 / 45.67 ', '(mathExpression 123 / 45.67)');
        macro(' 123 % 45.67 ', '(mathExpression 123 % 45.67)');
        macro(' 123 ** 45.67 ', '(mathExpression 123 ** 45.67)');
        macro(' 2*2+-3 ', '(mathExpression (mathPointExpression 2 * 2) + -3)');
        macro(' 2*2-3 ', '(mathExpression (mathPointExpression 2 * 2) - 3)');
        macro(' 2.1*2.2+-2.3 ', '(mathExpression (mathPointExpression 2.1 * 2.2) + -2.3)');
        macro(' 2.1*2.2-2.3 ', '(mathExpression (mathPointExpression 2.1 * 2.2) - 2.3)');
    }
})

Deno.test({
    name: 'parse math expressions with parenthesis',
    fn() {
        macro('(1+2)', '(mathExpression 1 + 2)');
        macro('(1+2)*3', '(mathExpression (mathExpression 1 + 2) * 3)');
        macro('1*(2+3)', '(mathExpression 1 * (mathExpression 2 + 3))');
    }
})

Deno.test({
    name: 'parse math operator precedence',
    fn() {
        macro(' 1 * 2 + 3', '(mathExpression (mathPointExpression 1 * 2) + 3)');
        macro(' 1 + 2 * 3 + 4', '(mathExpression 1 + (mathExpression (mathPointExpression 2 * 3) + 4))');
        macro(' 1 * 2 + 3 * 4', '(mathExpression (mathPointExpression 1 * 2) + (mathExpression 3 * 4))');
        macro(' 1 + 2 * 3 + 4 - 5 / 6 * (7 + 8) ', '(mathExpression 1 + (mathExpression (mathPointExpression 2 * 3) + (mathExpression 4 - (mathExpression 5 / (mathExpression 6 * (mathExpression 7 + 8))))))');
        macro('x(1) + y(2) * z(3)', '(mathExpression (function x 1) + (mathExpression (function y 2) * (function z 3)))');
    }
})

Deno.test({
    name: 'parse functions',
    fn() {
        macro('x(123)', '(function x 123)');
    }
})

Deno.test({
    name: 'parse pipelines',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize('123 |> x() |> y(1 |> z())');
        const result = new Parser(rules).parse(rules.program.rule, tokens);
        assertEquals(Parser.render(result!), '(pipeline 123 (pipeline (function x) (function y (pipeline 1 (function z)))))');
    }
})