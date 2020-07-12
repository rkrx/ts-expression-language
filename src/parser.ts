import {Token, ImmutableTokenStream, NextToken} from "./tokenizer.ts";
import {Term} from "./definitions.ts";

export interface ParserDefinition {
    [x: string]: {rule: AtomicStruct, postFilter?: (x: AstNode) => AstNode, ignore?: true}
}

enum StructType {
    Terminal,
    NonTerminal,
    Or,
    ZeroOrOne,
    ZeroOrMore,
    OneOrMore,
    Sequence
}

interface AtomicStruct {
    type: StructType
}

interface LogicalStruct extends AtomicStruct {
    items: AtomicStruct[]
}

interface TerminalRule extends AtomicStruct {
    type: StructType.Terminal,
    token: string
}

interface NonTerminalToken extends AtomicStruct {
    type: StructType.NonTerminal,
    token: string
}

interface OrRule extends LogicalStruct {
    type: StructType.Or
}

interface QuantifierStruct {
    unpackChildren: true,
    item: AtomicStruct
}

interface ZeroOrOneRule extends AtomicStruct, QuantifierStruct {
    type: StructType.ZeroOrOne
}

interface ZeroOrMoreRule extends AtomicStruct, QuantifierStruct {
    type: StructType.ZeroOrMore
}

interface OneOrMoreRule extends AtomicStruct, QuantifierStruct {
    type: StructType.OneOrMore
}

interface SeqRule extends LogicalStruct {
    type: StructType.Sequence,
    unpackChildren: true
}

export function or(...items: AtomicStruct[]): OrRule {
    return {type: StructType.Or, items};
}

export function zeroOrOne(item: AtomicStruct): ZeroOrOneRule {
    return {type: StructType.ZeroOrOne, item, unpackChildren: true};
}

export function zeroOrMore(item: AtomicStruct): ZeroOrMoreRule {
    return {type: StructType.ZeroOrMore, item, unpackChildren: true};
}

export function oneOrMore(item: AtomicStruct): OneOrMoreRule {
    return {type: StructType.OneOrMore, item, unpackChildren: true};
}

export function seq(...items: AtomicStruct[]): SeqRule {
    return {type: StructType.Sequence, items, unpackChildren: true};
}

export function t(token: Term): TerminalRule {
    return {type: StructType.Terminal, token};
}

export function nt(token: string): NonTerminalToken {
    return {type: StructType.NonTerminal, token};
}

export interface AstNode {
    type: string,
    value?: any,
    child?: AstNode,
    children?: AstNode[],
    line: number,
    column: number,
    complexity: number,
    ignore?: true,
    unpackChildren?: true
}

interface ParserParams {
    rule: AtomicStruct, 
    stream: ImmutableTokenStream, 
    level: number,
    recursionDetector: {[token: string]: {[id: number]: boolean}}
}

export class Parser {
    constructor(private rules: ParserDefinition) {}

    parse(rule: AtomicStruct, stream: ImmutableTokenStream): AstNode {
        this.indent('', 0);
        const [obj, resultStream] = this.handleType({rule, stream, level: 0, recursionDetector: {}});
        if(!resultStream.isEmpty()) {
            throw new Error('End of file not reached');
        }
        if(obj) {
            return obj;
        }
        throw new Error('Parser error');
    }

    static render(node: AstNode): string {
        if(node.children) {
            return `(${node.type} ${node.children.map(v => Parser.render(v)).join(' ')})`;
        } else if(node.child) {
            return `(${node.type} ${Parser.render(node.child)})`;
        }
        return `${node.value}`;
    }
    
    private handleType(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        if(params.level > 100) {
            throw new Error('Max recursion depth reached');
        }
        switch(params.rule.type) {
            case StructType.Or: return this.handleOr(params);
            case StructType.ZeroOrOne: return this.handleZeroOrOne(params);
            case StructType.ZeroOrMore: return this.handleZeroOrMore(params);
            case StructType.OneOrMore: return this.handleOneOrMore(params);
            case StructType.Sequence: return this.handleSequence(params);
            case StructType.Terminal: return this.handleTerminal(params);
            case StructType.NonTerminal: return this.handleNonTerminal(params);
            default: throw new Error(`Unknown struct type: ${params.rule.type}`);
        }
    }

    private handleOr(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        const token = params.stream.peekNextToken();
        return this.logRegion(`or Rule=${params.rule.type}; Token=${token.name}(${token.value})`, params.level, (level) => {
            let viablePaths: [AstNode|null, ImmutableTokenStream][] = [];
            for(const child of (params.rule as OrRule).items) {
                try {
                    const result = this.handleType({...params, rule: child, level});
                    if(result[0] !== null) {
                        this.indent(`found a match; complexity: ${result[0].complexity}`, level);
                        viablePaths.push([result[0], result[1]]);
                    }
                } catch (e) {
                    this.indent(`Error: ${e}`, level);
                }
            }
            if(viablePaths.length > 0) {
                viablePaths = viablePaths.sort((a, b) => {
                    if(a[1].getAll().length < b[1].getAll().length) {
                        return -1;
                    } else if(a[1].getAll().length > b[1].getAll().length) {
                        return 1;
                    }
                    return a[0]!.complexity < b[0]!.complexity ? -1 : (a[0]!.complexity > b[0]!.complexity ? 1 : 0);
                });
                this.indent(`Match found`, level);
                if(viablePaths.length > 2) {
                    this.indent(`🎃${viablePaths.map(v => `${v[0]?.type}=[${v[1].getAll().map(v => v.value)}];c=${v[0]?.complexity}`)}`, level);
                }
                return viablePaths[0];
            }
            this.indent(`No match`, level);
            return [null, params.stream];
        });
    }

    private handleZeroOrOne(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        let token = params.stream.peekNextToken();
        let streamRest: ImmutableTokenStream = params.stream;
        let node: AstNode|null = null;
        return this.logRegion(`zero-or-one Rule=${params.rule.type}; Token=${token.name}(${token.value})`, params.level, (level) => {
            const result: AstNode[] = [];
            let complexity = 0;
            [node, streamRest] = this.handleType({...params, rule: (params.rule as ZeroOrOneRule).item, stream: streamRest, level});
            complexity += node?.complexity ?? 0;
            this.addNodeToResult(result, node);
            this.indent(`Exit children=${result.length}`, level);
            return [{type: 'zero-or-one', children: result, line: token.line, column: token.column, complexity: complexity + 1, unpackChildren: true}, streamRest];
        });
    }
    
    private handleZeroOrMore(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        let token = params.stream.peekNextToken();
        let streamRest: ImmutableTokenStream = params.stream;
        let node: AstNode|null = null;
        return this.logRegion(`zero-or-more Rule=${params.rule.type}; Token=${token.name}(${token.value})`, params.level, (level) => {
            const result: AstNode[] = [];
            let complexity = 0;
            do {
                [node, streamRest] = this.handleType({...params, rule: (params.rule as ZeroOrMoreRule).item, stream: streamRest, level});
                complexity += node?.complexity ?? 0;
                this.addNodeToResult(result, node);
            } while(node !== null);
            this.indent(`Exit children=${result.length}`, level);
            return [{type: 'zero-or-more', children: result, line: token.line, column: token.column, complexity: complexity + 1, unpackChildren: true}, streamRest];
        });
    }
    
    private handleOneOrMore(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        let token = params.stream.peekNextToken();
        let streamRest: ImmutableTokenStream = params.stream;
        let node: AstNode|null = null;
        return this.logRegion(`zero-or-more Rule=${params.rule.type}; Token=${token.name}(${token.value})`, params.level, (level) => {
            const result: AstNode[] = [];
            let complexity = 0;
            do {
                [node, streamRest] = this.handleType({...params, rule: (params.rule as OneOrMoreRule).item, stream: streamRest, level});
                complexity += node?.complexity ?? 0;
                this.addNodeToResult(result, node);
            } while(node !== null);
            if(result.length < 1) {
                this.indent(`No match`, level);
                return [null, params.stream];
            }
            this.indent(`Exit children=${result.length}`, level);
            return [{type: 'zero-or-more', children: result, line: token.line, column: token.column, complexity: complexity + 1, unpackChildren: true}, streamRest];
        });
    }
    
    private handleSequence(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        let token = params.stream.peekNextToken();
        let streamRest: ImmutableTokenStream = params.stream;
        return this.logRegion(`seq Rule=${params.rule.type}; Token=${token.name}(${token.value})`, params.level, (level) => {
            let astNode = null, complexity: number = 0;
            const seq: AstNode[] = [];
            for(const item of (params.rule as SeqRule).items) {
                this.indent(`Seq: [${streamRest.getAll().map(t => t.token).join(' ')}]`, level);
                [astNode, streamRest] = this.handleType({...params, rule: item, stream: streamRest, level});
                if(astNode === null) {
                    this.indent(`Seq failed`, level);
                    return [null, params.stream];
                }
                complexity += astNode.complexity;
                if(!astNode.ignore) {
                    this.addNodeToResult(seq, astNode);
                }
            }
            this.indent(`Found seq: ${[{type: 'seq', children: seq.map(v => v.value)}, streamRest]}`, level);
            return [{type: 'seq', children: seq, line: token.line, column: token.column, complexity: complexity + 1, unpackChildren: true}, streamRest];
        });
    }
    
    private handleTerminal(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        const [token, streamRest] = params.stream.getNextToken();
        const lexRule: TerminalRule = params.rule as TerminalRule;
        return this.logRegion(`lex Rule=${lexRule.token}; Token=${token.name}(${token.value})`, params.level, (level) => {
            if(lexRule.token === token.name) {
                this.indent(`Found a match: ${token.value}`, level);
                const result: AstNode = {type: token.name, value: token.value, line: token.line, column: token.column, complexity: 1};
                if(token.discarnate) {
                    result.ignore = true
                }
                this.indent(`Match found`, level);
                return [result, streamRest];
            }
            this.indent(`No match`, level);
            return [null, params.stream];
        });
    }
    
    private handleNonTerminal(params: ParserParams): [AstNode|null, ImmutableTokenStream] {
        const rule = params.rule as NonTerminalToken;
        return this.logRegion(`rule ${rule.token}`, params.level, (level) => {
            const referencedRule = this.rules[rule.token];
            const token = params.stream.peekNextToken();
            const [node, streamRest] = this.handleType({...params, rule: referencedRule.rule, stream: params.stream, level});
            if(referencedRule.ignore) {
                this.indent(`Match found (with ignore flag)`, level);
                return [node, streamRest];
            }
            if(node !== null) {
                let result: AstNode = {type: rule.token, child: node, line: token.line, column: token.column, complexity: node.complexity + 1};
                this.indent(`Match found`, level);
                if(referencedRule.postFilter) {
                    result = referencedRule.postFilter(result);
                }
                if(result.child?.unpackChildren === true) {
                    result.children = result.child?.children ?? [];
                    delete result.child;
                }
                return [result, streamRest];
            }

            this.indent(`No match`, level);
            return [null, streamRest];
        });
    }

    private addNodeToResult(result: AstNode[], node: AstNode|null) {
        if(node !== null) {
            if(node.unpackChildren) {
                result.push(...(node.children ?? []));
            } else {
                result.push(node);
            }
        }
    }

    private logRegion<T>(caption: string, level: number, fn: (level: number) => T) {
        this.indent(`${caption} {`, level);
        try {
            return fn(level + 1)
        } finally {
            this.indent('}', level);
        }
    }
    
    private indent(msg: string, level: number) {
        //console.log(`${'| '.repeat(level)}${msg}`);
    }
}