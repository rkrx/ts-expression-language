import {AstNode} from "./parser.ts";
import {Environment} from "./runtime/environment.ts";

export class Runtime {
    constructor(private node: AstNode) {}

    execute(env: Environment): any {
        return this.loop(this.node, env);
    }

    private loop(node: AstNode, env: Environment): any {
        switch(node.type) {
            case 'mathPointExpression':
            case 'mathLineSymbol':
            case 'mathExpression': return this.evalMathExpression(node, env);
            case 'function': return this.evalFunction(node, env);
            case 'seq': return this.evalSequence(node, env);
            case 'Null': return null;
            case 'True': return true;
            case 'False': return false;
            case 'Int': return node.value ?? null;
            case 'Float': return node.value ?? null;
            case 'Plus': return '+';
            case 'Minus': return '-';
            case 'Mul': return '*';
            case 'Div': return '/';
            case 'Mod': return '%';
            case 'Pow': return '**';
            case 'pipeline': return this.evalPipeline(node, env);
            default: throw new Error(`Unknown type: ${node.type}`);
        }
    }

    private evalSequence(node: AstNode, env: Environment): AstNode[] {
        return (node.children ?? []).map(node => this.loop(node, env));
    }

    private evalFunction(node: AstNode, env: Environment) {
        try {
            const [name, ...params] = [...(node.children ?? [])];
            return env.invokeFunction(name.value, params.map(v => this.loop(v, env)));
        } catch (e) {
            this.runtimeFatalError(e, node, env);
        }
    }

    private evalMathExpression(node: AstNode, env: Environment) {
        try {
            /*if(node.child) {
                const seq = this.loop(node.child, env);
            } else {
                const seq = (node.children ?? []).map(v => this.loop(v, env));
            }*/
            const seq = (node.children ?? []).map(v => this.loop(v, env));
            switch(seq[1]) {
                case '+': return seq[0] + seq[2];
                case '-': return seq[0] - seq[2];
                case '*': return seq[0] * seq[2];
                case '/': return seq[0] / seq[2];
                case '%': return seq[0] % seq[2];
                case '**': return Math.pow(seq[0], seq[2]);
                default: throw new Error(`Unknown math symbol: ${seq[1]} ${JSON.stringify(node)}`);
            }
        } catch (e) {
            throw this.runtimeFatalError(e, node, env);
        }
    }

    private evalPipeline(node: AstNode, env: Environment) {
        const inst = this;
        const children = node.children ?? [];

        const fn = resolvePipeline(children[1]);
        const value = this.loop(children[0], env);
        return fn(value);
        
        function resolvePipeline(targetNode: AstNode): (value: any) => any {
            return (value: any) => {
                if(targetNode.type === 'pipeline') {
                    const [nextFnNode, newTargetNode] = targetNode.children!;
                    const newValue = invokeFunction(nextFnNode, [value]);
                    const fn = resolvePipeline(newTargetNode);
                    return fn(newValue);
                } else {
                    return invokeFunction(targetNode, [value]);
                }
            };
        }

        function invokeFunction(node: AstNode, value: any[]) {
            const [name, ...params] = [...(node.children ?? [])];
            return env.invokeFunction(name.value, [...value, ...(params.map(v => inst.loop(v, env)))]);
        }
    }

    private runtimeFatalError(e: string, node: AstNode, env: Environment) {
        throw new Error(`Fatal error: ${e} at line ${node.line}, column ${node.column}`);
    }
}