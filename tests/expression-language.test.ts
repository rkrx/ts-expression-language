import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {ExpressionLanguage} from "./../src/expression-language.ts";
import {Environment} from "../src/runtime/environment.ts";


Deno.test('simple expressions', () => {
    const el = new ExpressionLanguage();
    assertEquals(el.prepare('1+1').execute(new Environment()), 2);
});