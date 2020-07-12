import {Tokenizer} from "../src/tokenizer.ts";
import {terminals, Term} from "../src/definitions.ts";
import {assert, fail, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test({
    name: 'int values',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize(' 123, -1234 ');
        assertEquals(tokens.getAll(), [
            {name: Term.Int, token: "123", value: 123, id: 1, line: 1, column: 2, discarnate: false},
            {name: Term.Comma, token: ',', value: ',', id: 2, line: 1, column: 5, discarnate: true},
            {name: Term.Minus, token: "-", value: '-', id: 3, line: 1, column: 7, discarnate: false},
            {name: Term.Int, token: "1234", value: 1234, id: 4, line: 1, column: 8, discarnate: false}
        ]);
    }
});

Deno.test({
    name: 'float values',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize(' 123.0, 123.1, -123.45 ');
        assertEquals(tokens.getAll(), [
            {name: Term.Float, token: "123.0", value: 123, id: 1, line: 1, column: 2, discarnate: false},
            {name: Term.Comma, token: ',', value: ',', id: 2, line: 1, column: 7, discarnate: true},
            {name: Term.Float, token: "123.1", value: 123.1, id: 3, line: 1, column: 9, discarnate: false},
            {name: Term.Comma, token: ",", value: ',', id: 4, line: 1, column: 14, discarnate: true},
            {name: Term.Minus, token: "-", value: '-', id: 5, line: 1, column: 16, discarnate: false},
            {name: Term.Float, token: "123.45", value: 123.45, id: 6, line: 1, column: 17, discarnate: false},
        ]);
    }
});

Deno.test({
    name: 'single colon strings',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize(` 'a \\'b\\' \\\\\\'c\\\\\\' \\n \\r \\t' `);
        assertEquals(tokens.getAll(), [
            {name: Term.StringB, token: "'a \\'b\\' \\\\\\'c\\\\\\' \\n \\r \\t'", value: "a 'b' \\'c\\' \n \r \t", id: 1, line: 1, column: 2, discarnate: false},
        ]);
    }
});

Deno.test({
    name: 'double colon strings',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize(` "a \\"b\\" \\\\\\"c\\\\\\" \\n \\r \\t" `);
        assertEquals([
            {name: Term.StringA, token: '"a \\"b\\" \\\\\\"c\\\\\\" \\n \\r \\t"', value: 'a "b" \\"c\\" \n \r \t', id: 1, line: 1, column: 2, discarnate: false}
        ], tokens.getAll());
    }
});

Deno.test({
    name: 'pipelines',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize('x() |> y(1 |> z())');
        assertEquals(tokens.getAll(), [
            {name: Term.Identifier, token: "x", value: "x", id: 1, line: 1, column: 1, discarnate: false},
            {name: Term.ParenthesisOpen, token: "(", value: "(", id: 2, line: 1, column: 2, discarnate: true},
            {name: Term.ParenthesisClose, token: ")", value: ")", id: 3, line: 1, column: 3, discarnate: true},
            {name: Term.Pipe, token: "|>", value: "|>", id: 4, line: 1, column: 5, discarnate: true},
            {name: Term.Identifier, token: "y", value: "y", id: 5, line: 1, column: 8, discarnate: false},
            {name: Term.ParenthesisOpen, token: "(", value: "(", id: 6, line: 1, column: 9, discarnate: true},
            {name: Term.Int, token: "1", value: 1, id: 7, line: 1, column: 10, discarnate: false},
            {name: Term.Pipe, token: "|>", value: "|>", id: 8, line: 1, column: 12, discarnate: true},
            {name: Term.Identifier, token: "z", value: "z", id: 9, line: 1, column: 15, discarnate: false},
            {name: Term.ParenthesisOpen, token: "(", value: "(", id: 10, line: 1, column: 16, discarnate: true},
            {name: Term.ParenthesisClose, token: ")", value: ")", id: 11, line: 1, column: 17, discarnate: true},
            {name: Term.ParenthesisClose, token: ")", value: ")", id: 12, line: 1, column: 18, discarnate: true}
        ]);
    }
});

Deno.test({
    name: 'complex statements',
    fn() {
        const tokens = new Tokenizer(terminals).tokenize(' fun( 1  + 2 % fun( 1, " Hello world " , true, false )) = null');
        //const tokens = new Tokenizer(lexer).tokenize('1');
        assertEquals(tokens.getAll(), [
            {name: Term.Identifier, token: "fun", value: "fun", id: 1, line: 1, column: 2, discarnate: false},
            {name: Term.ParenthesisOpen, token: "(", value: "(", id: 2, line: 1, column: 5, discarnate: true},
            {name: Term.Int, token: "1", value: 1, id: 3, line: 1, column: 7, discarnate: false},
            {name: Term.Plus, token: "+", value: "+", id: 4, line: 1, column: 10, discarnate: false},
            {name: Term.Int, token: "2", value: 2, id: 5, line: 1, column: 12, discarnate: false},
            {name: Term.Mod, token: "%", value: "%", id: 6, line: 1, column: 14, discarnate: false},
            {name: Term.Identifier, token: "fun", value: "fun", id: 7, line: 1, column: 16, discarnate: false},
            {name: Term.ParenthesisOpen, token: "(", value: "(", id: 8, line: 1, column: 19, discarnate: true},
            {name: Term.Int, token: "1", value: 1, id: 9, line: 1, column: 21, discarnate: false},
            {name: Term.Comma, token: ",", value: ",", id: 10, line: 1, column: 22, discarnate: true},
            {name: Term.StringA, token: '" Hello world "', value: " Hello world ", id: 11, line: 1, column: 24, discarnate: false},
            {name: Term.Comma, token: ",", value: ",", id: 12, line: 1, column: 40, discarnate: true},
            {name: Term.True, token: "true", value: true, id: 13, line: 1, column: 42, discarnate: false},
            {name: Term.Comma, token: ",", value: ",", id: 14, line: 1, column: 46, discarnate: true},
            {name: Term.False, token: "false", value: false, id: 15, line: 1, column: 48, discarnate: false},
            {name: Term.ParenthesisClose, token: ")", value: ")", id: 16, line: 1, column: 54, discarnate: true},
            {name: Term.ParenthesisClose, token: ")", value: ")", id: 17, line: 1, column: 55, discarnate: true},
            {name: Term.Equals, token: "=", value: "=", id: 18, line: 1, column: 57, discarnate: true},
            {name: Term.Null, token: "null", value: null, id: 19, line: 1, column: 59, discarnate: false}
        ]);
    }
});