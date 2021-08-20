import { AssignableExpression, Ast, Expression, Statement } from "./ast";

export type Value =
    | { type: "number", value: number }
    | { type: "string", value: string }
    | { type: "boolean", value: boolean }
    | { type: "list", value: Value[] }
    | { type: "procedure", builtin: true, call(ast: Ast<Annotations>, params: Value[]): Promise<Value> }
    | { type: "void" }

export type Annotations = { evaluated?: Value, isRunning?: boolean, error?: string }

export class RuntimeError extends Error {
    constructor() {
        super("the message is in the AST");
        Object.setPrototypeOf(this, RuntimeError.prototype);
    }
}

export function isEqual(a: Value, b: Value): boolean {
    if ((a.type === "boolean" && b.type === "boolean")
        || (a.type === "number" && b.type === "number")
        || (a.type === "string" && b.type === "string")) {
        return a.value === b.value;
    } else if (a.type === "list" && b.type === "list") {
        if (a.value.length !== b.value.length) return false;
        for (let i = 0; i < a.value.length; i++) {
            if (a.value[i] !== b.value[i]) return false;
            return true;
        }
    } else if (a.type === "procedure" && b.type === "procedure") {
        if (a.builtin && b.builtin) return a.call === b.call;
        return false;
    } else if (a.type === "void" && b.type === "void") return true;
    return false;
}

type InterpreterCallbacks = {
    onDisplay(x: Value): Promise<void>
    onInput(): Promise<string>
}

export class Interpreter {
    globals: Map<string, Value>;
    callbacks: InterpreterCallbacks;

    constructor(callbacks: InterpreterCallbacks) {
        this.callbacks = callbacks;
        this.globals = new Map();

        this.globals.set("DISPLAY", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations>, params: Value[]) => {
                if (params.length !== 1) {
                    this.error(ast, "DISPLAY takes 1 argument");
                }
                await this.callbacks.onDisplay(params[0]);
                console.log("continuing to next DISPLAY")
                return { type: "void" };
            })
        })

        this.globals.set("INPUT", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations>, params: Value[]) => {
                if (params.length !== 0) {
                    this.error(ast, "INPUT takes no arguments");
                }
                const inputString = await this.callbacks.onInput();
                const num = Number(inputString);
                if (isNaN(num)) {
                    return { type: "string", value: inputString }
                } else {
                    return { type: "number", value: num };
                }
            })
        })
    }

    error(expr: Ast<Annotations>, message: string): never {
        expr.error = message;
        throw new RuntimeError();
    }

    async expectType<T extends Value["type"]>(expr: Expression<Annotations>, type: T): Promise<Value & { type: T }> {
        const value = await this.evaluate(expr);
        if (value.type === type) {
            return value as Value & { type: T };
        } else {
            this.error(expr, `should be a ${type}`)
        }
    }

    async runBlock(block: Statement<Annotations>[]): Promise<void> {
        for (let stat of block) {
            stat.isRunning = true;
            await this.run(stat);
            stat.isRunning = false;
        }
    }

    async assign(ast: AssignableExpression<Annotations>, value: Value) {
        if (ast.type === "variable") {
            this.globals.set(ast.name, value);
        } else {
            const index = (await this.expectType(ast.index, "number")).value;

            const list = (await this.expectType(ast.list, "list")).value;

            if (!Number.isInteger(index)) this.error(ast.index, "must be an integer");
            if (index <= 0) this.error(ast.index, "must be >= 1");
            if (index > list.length) this.error(ast.list, "index bigger than list length");

            list[index - 1] = value;
        }
    }

    async run(ast: Statement<Annotations>): Promise<void> {
        if (ast.type === "assign") {
            const value = await this.evaluate(ast.rhs);
            await this.assign(ast.lhs, value);
        } else if (ast.type === "if") {
            const condition = (await this.expectType(ast.condition, "boolean")).value;
            ast.condition.evaluated = { type: "boolean", value: condition };
            if (condition) {
                await this.runBlock(ast.iftrue);
            }
        } else if (ast.type === "ifelse") {
            const condition = (await this.expectType(ast.condition, "boolean")).value;
            ast.condition.evaluated = { type: "boolean", value: condition };
            if (condition) {
                await this.runBlock(ast.iftrue);
            } else {
                await this.runBlock(ast.iffalse);
            }
        } else if (ast.type === "exprstat") {
            this.evaluate(ast.expr);
        } else if (ast.type === "foreach") {
            const list = (await this.expectType(ast.list, "list")).value;
            for (const x of list) {
                await this.assign(ast.itemvar, x);
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "procedure") {
            this.error(ast, "can't handle this");
        } else if (ast.type === "repeattimes") {
            const n = (await this.expectType(ast.times, "number")).value;
            if (!Number.isInteger(n)) this.error(ast.times, "must be an integer");
            if (n < 0) this.error(ast.times, "must be positive");

            for (let i = 0; i < n; i++) {
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "repeatuntil") {
            while (true) {
                const condition = (await this.expectType(ast.condition, "boolean")).value;
                if (condition) break;
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "return") {
            this.error(ast, "can't handle this");
        } else if (ast.type === "returnvoid") {
            this.error(ast, "can't handle this");
        }
    }

    async evaluate(ast: Expression<Annotations>): Promise<Value> {
        if (ast.type === "operator") {
            if (ast.operator === "!=" || ast.operator === "=") {
                const lhs = await this.evaluate(ast.lhs);
                const rhs = await this.evaluate(ast.rhs);
                const equals = isEqual(lhs, rhs);

                const result = ast.operator === "!=" ? !equals : equals;
                return { type: "boolean", value: result };
            } else if (ast.operator === "*" || ast.operator === "+" ||
                ast.operator === "-" || ast.operator === "/" || ast.operator === "MOD") {
                const a = (await this.expectType(ast.lhs, "number")).value;
                const b = (await (this.expectType(ast.rhs, "number"))).value;
                const value = ast.operator === "*" ? a * b
                    : ast.operator === "+" ? a + b
                        : ast.operator === "-" ? a - b
                            : ast.operator === "/" ? a / b :
                                a % b;
                return { type: "number", value }
            } else if (ast.operator === "<" || ast.operator === "<=" ||
                ast.operator === ">" || ast.operator === ">=") {
                const a = (await this.expectType(ast.lhs, "number")).value;
                const b = (await (this.expectType(ast.rhs, "number"))).value;
                const value = ast.operator === ">" ? a > b
                    : ast.operator === ">=" ? a >= b
                        : ast.operator === "<" ? a < b
                            : a <= b;
                return { type: "boolean", value };
            } else if (ast.operator === "AND" || ast.operator === "OR") {
                const a = (await this.expectType(ast.lhs, "boolean")).value;
                const b = (await (this.expectType(ast.rhs, "boolean"))).value;
                const value = ast.operator === "AND" ? a && b : a || b;
                return { type: "boolean", value };
            }
        }
        else if (ast.type === "not") {
            const x = (await this.expectType(ast.value, "boolean")).value;
            return { type: "boolean", value: !x };
        } else if (ast.type === "boolean") {
            return { type: "boolean", value: ast.value }
        } else if (ast.type === "number") {
            return { type: "number", value: ast.value }
        } else if (ast.type === "string") {
            return { type: "string", value: ast.value };
        } else if (ast.type === "subscript") {
            const index = (await this.expectType(ast.index, "number")).value;

            const list = (await this.expectType(ast.list, "list")).value;

            if (!Number.isInteger(index)) this.error(ast.index, "must be an integer");
            if (index <= 0) this.error(ast.index, "must be >= 1");
            if (index > list.length) this.error(ast.list, "index bigger than list length");

            return list[index - 1];
        } else if (ast.type === "list") {
            let value: Value[] = [];
            for (const item of ast.items) {
                value.push(await this.evaluate(item));
            }
            return { type: "list", value }
        } else if (ast.type === "negate") {
            const num = this.expectType(ast.value, "number");
            return { type: "number", value: -num };
        } else if (ast.type === "variable") {
            const value = this.globals.get(ast.name);
            if (value === undefined) {
                this.error(ast, "unknown name");
            }
            return value;
        } else if (ast.type === "call") {
            const procedure = await this.expectType(ast.procedure, "procedure")
            let paramaters: Value[] = [];
            for (const item of ast.paramaters) {
                paramaters.push(await this.evaluate(item));
            }
            // we need to pass the ast so it can set 'error' flag
            return await procedure.call(ast, paramaters);
        }
        this.error(ast, "can't handle this");
    }
}