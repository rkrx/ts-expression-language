import {Runtime} from "./runtime.ts";
import {Environment} from "./runtime/environment.ts";
import {Parser} from "./parser.ts";
import {Tokenizer} from "./tokenizer.ts";
import {terminals, rules} from "./definitions.ts";

export class ExpressionLanguage {
    private readonly parser: Parser;
    private readonly tokenizer: Tokenizer;

    constructor(
        ) {
        this.tokenizer = new Tokenizer(terminals),
        this.parser = new Parser(rules);
    }
    
    compile(src: string): Runtime {
        const stream = this.tokenizer.tokenize(src);
        const ast = this.parser.parse(rules.program.rule, stream);
        return new Runtime(ast);

    }

    filter(src: string, env: Environment) {
    }
}
