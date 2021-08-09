// https://stackoverflow.com/a/64174790/13155893
export const operators = ["+", "-", "*", "/", "MOD"
    , "=", "!=", ">", "<", ">=", "<="
    , "AND", "OR"] as const;
export type Operator = typeof operators[number];

export type Literal =
    | { type: "string", value: string }
    | { type: "number", value: number }
    | { type: "boolean", value: boolean };
export type Ast =
    | { type: "assign", lhs: Ast, rhs: Ast }
    | { type: "operator", operator: Operator, lhs: Ast, rhs: Ast }
    | { type: "not", value: Ast }
    | { type: "if", condition: Ast, iftrue: Ast[] }
    | { type: "ifelse", condition: Ast, iftrue: Ast[], iffalse: Ast[] }
    | { type: "repeattimes", times: Ast, block: Ast[] }
    | { type: "repeatuntil", condition: Ast, block: Ast[] }
    | { type: "list", items: Ast[] }
    | { type: "subscript", list: Ast, index: Ast }
    | { type: "foreach", itemvar: Ast, list: Ast, block: Ast[] }
    | { type: "procedure", name: Ast, paramaters: string[], block: Ast[] }
    | { type: "return", value: Ast }
    | { type: "returnvoid" }
    | { type: "call", procedure: Ast, paramaters: Ast[] }
    | Literal
    | { type: "variable", name: string }
    | { type: "exprstat", expr: Ast }
    ;

export type Location = { line: number, col: number };

export const keywords = ["AND", "EACH", "ELSE", "FOR", "IF", "IN", "MOD", "NOT", "OR", "PROCEDURE", "REPEAT", "RETURN", "REPEATTIMES", "UNTIL"] as const;
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