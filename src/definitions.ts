import {TerminalDefinition} from "./tokenizer.ts";
import {ParserDefinition, or, zeroOrMore, zeroOrOne, t, seq, nt} from "./parser.ts";

const replaceSpecialCharacters = function (char: string): string {
    switch(char) {
        case 'r': return "\r";
        case 'n': return "\n";
        case 't': return "\t";
        default: return char;
    }
};

export enum Term {
    True = 'True',
    False = 'False',
    Null = 'Null',
    Float = 'Float', 
    Int = 'Int',
    Identifier = 'Identifier',
    StringA = 'StringA',
    StringB = 'StringB',
    LogicalAnd = 'LogicalAnd',
    LogicalOr = 'LogicalOr',
    Pipe = 'Pipe',
    Pow = 'Pow',
    Plus = 'Plus',
    Minus = 'Minus',
    Mul = 'Mul',
    Div = 'Div',
    Mod = 'Mod',
    Doublecolon = 'Doublecolon',
    Equals = 'Equals',
    ParenthesisOpen = 'ParenthesisOpen',
    ParenthesisClose = 'ParenthesisClose',
    BracketOpen = 'BracketOpen',
    BracketClose = 'BracketClose',
    CurlybracketOpen = 'CurlybracketOpen',
    CurlybracketClose = 'CurlybracketClose',
    Comma = 'Comma',
    Semicolon = 'Semicolon'
}

export const terminals: TerminalDefinition[] = [
    {id: Term.True, pattern: 'true', converter: () => true},
    {id: Term.False, pattern: 'false', converter: () => false},
    {id: Term.Null, pattern: 'null', converter: () => null},
    {id: Term.Float, pattern: /^\d*\.\d+/, converter: value => parseFloat(value)},
    {id: Term.Int, pattern: /^\d+/, converter: value => parseInt(value)},
    {id: Term.Identifier, pattern: /^[a-zA-Z_]+\b/},
    {id: Term.StringA, pattern: /^(?:".*?(?<!\\(?:\\\\)*)")/, converter: value => value.substring(1, value.length - 1).replaceAll(/\\(.)/g, (_, matches) => replaceSpecialCharacters(matches[0]))},
    {id: Term.StringB, pattern: /^(?:'.*?(?<!\\(?:\\\\)*)')/, converter: value => value.substring(1, value.length - 1).replaceAll(/\\(.)/g, (_, matches) => replaceSpecialCharacters(matches[0]))},
    {id: Term.LogicalAnd, pattern: '&&', discarnate: true},
    {id: Term.LogicalOr, pattern: '||', discarnate: true},
    {id: Term.Pipe, pattern: '|>', discarnate: true},
    {id: Term.Pow, pattern: '**'},
    {id: Term.Plus, pattern: '+'},
    {id: Term.Minus, pattern: '-'},
    {id: Term.Mul, pattern: '*'},
    {id: Term.Div, pattern: '/'},
    {id: Term.Mod, pattern: '%'},
    {id: Term.Doublecolon, pattern: ':', discarnate: true},
    {id: Term.Equals, pattern: '=', discarnate: true},
    {id: Term.ParenthesisOpen, pattern: '(', discarnate: true},
    {id: Term.ParenthesisClose, pattern: ')', discarnate: true},
    {id: Term.BracketOpen, pattern: '[', discarnate: true},
    {id: Term.BracketClose, pattern: ']', discarnate: true},
    {id: Term.CurlybracketOpen, pattern: '{', discarnate: true},
    {id: Term.CurlybracketClose, pattern: '}', discarnate: true},
    {id: Term.Comma, pattern: ',', discarnate: true},
    {id: Term.Semicolon, pattern: ';', discarnate: true},
];

export const rules: ParserDefinition = {
    // Booleans
    booleanConstants: {ignore: true, rule: or(t(Term.True), t(Term.False))},
    booleanExpression: {ignore: true, rule: or(
        nt('booleanConstants')
    )},

    // Strings
    string: {ignore: true, rule: or(t(Term.StringA), t(Term.StringB))},

    // Numbers and Math
    numeric: {postFilter: node => node.child ?? node, rule: or(t(Term.Float), t(Term.Int))},
    positiveNumber: {ignore: true, rule: seq(t(Term.Plus), nt('numeric'))},
    negativeNumber: {rule: seq(t(Term.Minus), nt('numeric')), postFilter: node => {
        const valueNode = (node?.child?.children ?? [])[1] ?? null;
        valueNode.value = -valueNode.value;
        return valueNode;
    }},
    number: {ignore: true, rule: or(nt('negativeNumber'), nt('positiveNumber'), nt('numeric'))},
    mathLineSymbol: {ignore: true, rule: or(t(Term.Plus), t(Term.Minus))},
    mathPointSymbol: {ignore: true, rule: or(t(Term.Mul), t(Term.Div), t(Term.Mod), t(Term.Pow))},
    mathSymbol: {ignore: true, rule: or(nt('mathPointSymbol'), nt('mathLineSymbol'))},
    mathExpressionLeft: {ignore: true, rule: or(
        nt('function'),
        nt('number')
    )},
    mathPointExpression: {rule: or(
        seq(nt('mathExpressionLeft'), nt('mathPointSymbol'), nt('mathPointExpression')),
        seq(nt('mathExpressionLeft'), nt('mathPointSymbol'), nt('number')),
        seq(nt('mathExpressionLeft')),
    )},
    mathExpression: {rule: or(
        seq(t(Term.ParenthesisOpen), nt('mathExpression'), t(Term.ParenthesisClose), nt('mathSymbol'), nt('mathExpression')),
        seq(t(Term.ParenthesisOpen), nt('mathExpression'), t(Term.ParenthesisClose)),
        seq(nt('mathPointExpression'), nt('mathLineSymbol'), nt('mathExpression')),
        seq(nt('mathExpressionLeft'), nt('mathSymbol'), nt('mathExpression')),
        seq(nt('mathExpressionLeft'), nt('mathSymbol'), nt('number')),
        seq(nt('mathExpressionLeft')),
    ), postFilter: node => node?.child?.children?.length === 1 ? node.child.children[0] : node},
    
    // Functions
    parameterList: {ignore: true, rule: seq(zeroOrMore(seq(nt('expression'), t(Term.Comma))), zeroOrOne(nt('expression')))},
    function: {rule: seq(t(Term.Identifier), t(Term.ParenthesisOpen), nt('parameterList'), t(Term.ParenthesisClose))},

    // Pipeline
    pipeline: {rule: or(
        seq(nt('function'), t(Term.Pipe), nt('pipeline')),
        seq(nt('number'), t(Term.Pipe), nt('pipeline')),
        seq(nt('function'), t(Term.Pipe), nt('function')),
        seq(nt('number'), t(Term.Pipe), nt('function'))
    )},

    // Arrays
    array: {rule: seq(t(Term.BracketOpen), zeroOrMore(seq(nt('expression'), t(Term.Comma))), zeroOrOne(nt('expression')), t(Term.BracketClose)), postFilter: node => {
        node.children = node.child?.children ?? [];
        delete node.child;
        return node;
    }},
    
    // Hashes
    hashKey: {ignore: true, rule: or(nt('string'), t(Term.Identifier))},
    hashKeyValue: {rule: or(seq(nt('hashKey'), t(Term.Doublecolon), nt('expression')), seq(t(Term.Identifier)))},
    hash: {rule: seq(t(Term.CurlybracketOpen), zeroOrMore(seq(nt('hashKeyValue'), t(Term.Comma))), zeroOrOne(nt('hashKeyValue')), t(Term.CurlybracketClose))},
    
    // Common expressions
    expression: {ignore: true, rule: or(
        nt('booleanExpression'),
        nt('mathExpression'), 
        nt('function'),
        nt('pipeline'),
        nt('hash'),
        nt('array'),
        nt('number'),
        nt('string'),
        t(Term.Null),
    )},
        
    // Entry point
    program: {rule: nt('expression')}
};

