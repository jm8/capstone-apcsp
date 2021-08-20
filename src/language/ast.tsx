// https://stackoverflow.com/a/64174790/13155893
export const operators = ["+", "-", "*", "/", "MOD"
    , "=", "!=", ">", "<", ">=", "<="
    , "AND", "OR"] as const;
export type Operator = typeof operators[number];

export function isLiteral(x: Ast | Token): x is Literal {
    return (x.type === "string" || x.type === "number" || x.type === "boolean");
}
export type Literal =
    | { type: "string", value: string }
    | { type: "number", value: number }
    | { type: "boolean", value: boolean };

export type Ast<T = {}> = Statement<T> | Expression<T>;

export type Statement<T = {}> = (
    | { type: "assign", lhs: AssignableExpression<T>, rhs: Expression<T> }
    | { type: "if", condition: Expression<T>, iftrue: Statement<T>[] }
    | { type: "ifelse", condition: Expression<T>, iftrue: Statement<T>[], iffalse: Statement<T>[] }
    | { type: "repeattimes", times: Expression<T>, block: Statement<T>[] }
    | { type: "repeatuntil", condition: Expression<T>, block: Statement<T>[] }
    | { type: "foreach", itemvar: AssignableExpression<T>, list: Expression<T>, block: Statement<T>[] }
    | { type: "procedure", name: string, paramaters: string[], block: Statement<T>[] }
    | { type: "return", value: Expression<T> }
    | { type: "returnvoid" }
    | { type: "exprstat", expr: Expression<T> }) & T


export type Expression<T = {}> = (
    | { type: "operator", operator: Operator, lhs: Expression<T>, rhs: Expression<T> }
    | { type: "not", value: Expression<T> }

    | { type: "list", items: Expression<T>[] }
    | { type: "subscript", list: Expression<T>, index: Expression<T> }
    | { type: "call", procedure: Expression<T>, paramaters: Expression<T>[] }
    | Literal
    | { type: "variable", name: string }
    | { type: "negate", value: Expression<T> }) & T
    ;

export type AssignableExpression<T = {}> = (
    | { type: "variable", name: string }
    | { type: "subscript", list: AssignableExpression<T>, index: Expression<T> }) & T

export function isAssignable(ast: Expression): ast is AssignableExpression {
    return ast.type === "variable" || (ast.type === "subscript" && isAssignable(ast.list));
}


export type Location = { line: number, col: number };

export const keywords = ["AND", "EACH", "ELSE", "FOR", "IF", "IN", "MOD", "NOT", "OR", "PROCEDURE", "REPEAT", "RETURN", "TIMES", "UNTIL"] as const;
export type Keyword = typeof keywords[number];

export const symbols = ["{", "}", "[", "]", "(", ")", "<-", ","] as const;
export type Symbol = typeof symbols[number];

export type Token =
    | { type: Operator }
    | { type: Keyword }
    | { type: Symbol }
    | { type: "variable", name: string }
    | Literal
    ;

export type LocatedToken = Token & { location: Location }