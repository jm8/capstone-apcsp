import { Ast, Location, Token, isLiteral, operators, isAssignable, LocatedToken, Statement, Expression } from './ast'
import { tokenize } from './tokenizer';

export class ParseError extends Error {
    location: Location;
    constructor(location: Location, message: string) {
        super(message);
        Object.setPrototypeOf(this, ParseError.prototype);

        this.location = location;
    }
}


export function parse(code: string): Statement[] {
    return new Parser(tokenize(code)).program();
}

export function parseExpression(code: string): Expression {
    return new Parser(tokenize(code)).expression(0);
}

class Parser {
    tokens: LocatedToken[];
    current: number;

    constructor(tokens: LocatedToken[]) {
        this.tokens = tokens;
        this.current = 0;
    }

    get next(): LocatedToken | null {
        if (this.current < this.tokens.length) return this.tokens[this.current];
        return null;
    }

    get location(): Location {
        return this.next?.location ?? this.tokens[this.tokens.length - 1].location;
    }

    precedences: Map<Token["type"], number> = new Map([
        ["+", 60],
        ["-", 60],
        ["*", 70],
        ["/", 70],
        ["MOD", 70],
        ["=", 40],
        ["!=", 40],
        [">", 50],
        ["<", 50],
        [">=", 50],
        ["<=", 50],
        ["AND", 30],
        ["OR", 20],
        ["<-", 10],
        ["(", 80],
        ["[", 80],
    ])

    get nextPrecedence(): number {
        if (!this.next) return 0;
        return this.precedences.get(this.next.type) || 0;
    }

    accept(type: Token["type"]): Token | null {
        if (this.next?.type === type) {
            return this.consume();
        }
        return null;
    }

    expect(type: Token["type"], message: string): Token {
        if (this.next === null || this.next.type !== type) {
            throw new ParseError({ line: 1, col: 1 }, message);
        } else {
            return this.consume() as Token;
        }
    }

    consume(): Token | null {
        const token = this.next;
        this.current++;
        return token;
    }

    program(): Statement[] {
        let result = [];
        while (this.next) {
            result.push(this.statement());
        }
        return result;
    }

    block(): Statement[] {
        this.expect("{", "Expected a block in curly braces");
        let result = [];
        while (this.next?.type !== "}") {
            result.push(this.statement());
        }
        this.expect("}", "Expected a curly braces to close the block");
        return result;
    }

    statement(): Statement {
        if (this.accept("IF")) {
            this.expect("(", "Expected parentheses around condition");
            const condition = this.expression(0);
            this.expect(")", "Expected a closing parenthesis");
            const iftrue = this.block();
            if (this.accept("ELSE")) {
                const iffalse = this.block();
                return { type: "ifelse", condition, iftrue, iffalse };
            } else {
                return { type: "if", condition, iftrue };
            }
        }
        else if (this.accept("RETURN")) {
            if (!this.next || this.next.type === "}") {
                return { type: "returnvoid" };
            } else {
                return { type: "return", value: this.expression(0) };
            }
        }
        else if (this.accept("PROCEDURE")) {
            const variable = this.expect("variable", "Expected a procedure name") as Token & { type: "variable" };
            const name = variable.name;
            this.expect("(", "Expected a '(' for the paramater list");
            const paramaters = [];
            if (!this.accept(")")) {
                do {
                    const param = this.expect("variable", "Expected a paramter name") as Token & { type: "variable" };
                    paramaters.push(param.name);
                } while (this.accept(","));
                this.expect(")", "Expected ')' to end paramater list");
            }
            return { type: "procedure", name, paramaters, block: this.block() };

        } else if (this.accept("REPEAT")) {
            if (this.accept("UNTIL")) {
                this.expect("(", "Expected parentheses around condition");
                const condition = this.expression(0);
                this.expect(")", "Expected a closing parenthesis");
                return { type: "repeatuntil", condition, block: this.block() };
            } else {
                const times = this.expression(0);
                this.expect("TIMES", "Repeat must be REPEAT n TIMES or REPEAT UNTIL(condition)");
                return { type: "repeattimes", times, block: this.block() };
            }
        } else if (this.accept("FOR")) {
            this.expect("EACH", "FOR needs to have FOR EACH");
            const itemvar = this.expect("variable", "FOR EACH needs a variable") as Expression;
            this.expect("IN", "FOR EACH needs an IN");
            const list = this.expression(0);
            const block = this.block();
            if (!isAssignable(itemvar)) {
                throw new ParseError(this.location, "must be a variable name");
            }
            return { type: "foreach", itemvar, list, block };
        } else {
            // assignment is parsed with expressions since it is impossible to know
            // if it is an assignment or something else when you look at it.

            const expr = this.expression(0, true);

            if (expr.type === "assign") {
                return expr;
            }
            else {
                return { type: "exprstat", expr }
            };
        }
    }

    primary(isStatement: boolean = false): Expression {
        if (this.accept("NOT")) {
            return { type: "not", value: this.expression(0) }
        }
        else if (this.accept("-")) {
            return { type: "negate", value: this.expression(0) }
        } else if (this.next && isLiteral(this.next)) {
            const literal = this.next;
            this.consume();
            return literal;
        } else if (this.accept("(")) {
            const expr = this.expression(0);
            this.expect(")", "Closing paren");
            return expr;
        } else if (this.accept("[")) {
            let items = [];
            if (!this.accept("]")) {
                do {
                    items.push(this.expression(0));
                } while (this.accept(","));
                this.expect("]", "Expected close bracket to end list");
            }
            return { type: "list", items };
        } else if (this.next?.type === 'variable') {
            const expr: Expression = { type: 'variable', name: this.next.name };
            this.consume();
            return expr;
        } else if (this.accept(")")) {
            throw new ParseError(this.location, `This ')' has no matching '(' to close`);
        } else if (this.accept("]")) {
            throw new ParseError(this.location, `This ']' has no matching '[' to close`);
        } else {
            throw new ParseError(this.location, `Expected an expression${isStatement ? " or statement" : ""}`);
        }
    }

    expression(minPrecToStop: number): Expression;
    expression(minPrecToStop: number, isStatement: false): Expression;
    expression(minPrecToStop: number, isStatement: true): Expression | (Statement & { type: "assign" });

    expression(minPrecToStop: number, isStatement: boolean = false): Expression | (Statement & { type: "assign" }) {
        let result = this.primary(isStatement);

        while (minPrecToStop < this.nextPrecedence) {
            const token = this.consume();
            if (!token) break;

            const op = operators.find((x) => x === token.type);
            if (op) {
                // a regular operator
                const rhs = this.expression(this.precedences.get(op) || 0, false);
                result = { type: "operator", operator: op, lhs: result, rhs }
            } else if (token.type === "(") {
                let paramaters = [];
                if (!this.accept(")")) {
                    do {
                        paramaters.push(this.expression(0));
                    } while (this.accept(","));
                    this.expect(")", "Expected ')' to end paramater list");
                }
                result = { type: "call", procedure: result, paramaters };
            } else if (token.type === "[") {
                const index = this.expression(0);
                this.expect("]", "Expected a ']' to close the list");
                result = { type: "subscript", list: result, index };
            } else if (token.type === "<-") {
                if (isStatement) {
                    if (!isAssignable(result)) throw new ParseError(this.location, "Can only assign to a variable or list item");
                    return { type: "assign", lhs: result, rhs: this.expression(0) };
                } else {
                    throw new ParseError(this.location, "Assignment must be a statement");
                }
            }
        }

        return result;
    }
}