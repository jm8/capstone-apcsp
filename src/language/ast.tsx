export type Operator =
    | "+" | "-" | "*" | "/" | "MOD"
    | "=" | "!=" | ">" | "<" | ">=" | "<="
    | "AND" | "OR";
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
    | { type: "string", value: string }
    | { type: "number", value: number }
    | { type: "boolean", value: boolean }
    | { type: "variable", name: string }
    | { type: "exprstat", expr: Ast }
    ;