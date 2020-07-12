import { Source } from "./source.ts";
import { Term } from "./definitions.ts";

export interface TerminalDefinition {
    id: string,
    pattern: RegExp|string,
    discarnate?: true,
    converter?: (input: string) => any
}

export interface Token {
    name: string,
    token: string,
    value: any,
    id: number,
    line: number,
    column: number,
    discarnate: boolean
}

export interface NextToken {
    token: Token,
    stream: ImmutableTokenStream
}

export class ImmutableTokenStream {
    constructor(private tokens: Token[]) {}

    isEmpty(): boolean {
        return this.tokens.length < 1;
    }

    peekNextToken(): Token {
        if(this.tokens.length > 0) {
            return this.tokens[0];
        }
        throw new Error("Parser error: Premature end of file")
    }

    getNextToken(): [Token, ImmutableTokenStream] {
        if(this.tokens.length > 0) {
            return [this.tokens[0], new ImmutableTokenStream(this.tokens.slice(1))];
        }
        throw new Error("Parser error: Premature end of file")
    }

    getAll(): Token[] {
        return this.tokens;
    }
}

export class Tokenizer {
    constructor(private definitions: TerminalDefinition[]) {}

    tokenize(source: string): ImmutableTokenStream {
        const src = new Source(source);
        const res: Token[] = [];
        for(const token of this.tokenizeSource(src)) {
            res.push(token);
        }
        return new ImmutableTokenStream(res);
    }

    static render(stream: ImmutableTokenStream) {
        const result: string[] = [];
        for (const token of stream.getAll()) {
            result.push(`${token.token} (name=${token.name}; val=${JSON.stringify(token.value)}; id=${token.id}; l=${token.line}, ${token.column}; ${JSON.stringify(token.discarnate)})`);
        }
        return `\n> ${stream.getAll().map(v => v.token).join(' ')}\n[\n    ${result.join("\n    ")}\n]\n`;
    }

    private *tokenizeSource(source: Source): Iterable<Token> {
        let id: number = 0;
        while(!source.noMoreData()) {
            source.skipWhitepace();
            let found = false;
            for(const def of this.definitions) {
                if(source.startsWith(def.pattern)) {
                    const line = source.getLine();
                    const column = source.getColumn();
                    const token = source.readPattern(def.pattern);
                    const value = def.converter ? def.converter(token) : token;
                    const discarnate = def.discarnate ?? false;
                    found = true;
                    id++;
                    yield {name: def.id, token, value, id, line, column, discarnate};
                    break;
                }
            }
            if(!found) {
                throw new Error(`Parser error at line ${source.getLine()}, col ${source.getColumn()}: ${source.peekBack(20)}🚨${source.peek(20)}`);
            }
        }
    }
}