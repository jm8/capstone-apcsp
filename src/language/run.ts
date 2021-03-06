import { AssignableExpression, Ast, Expression, Statement } from "./ast";
import cloneDeep from "lodash.clonedeep";
import isequal from "lodash.isequal";

export type Value =
    | { type: "number", value: number }
    | { type: "string", value: string }
    | { type: "boolean", value: boolean }
    | { type: "list", value: Value[] }
    | { type: "procedure", builtin: true, call(ast: Ast<Annotations> & { type: "call" }, params: Value[]): Promise<Value> }
    | { type: "procedure", builtin: false, ast: Ast<Annotations> & { type: "procedure" } }
    | { type: "void" }

export type Annotations = { evaluated?: Value, isRunning?: boolean, error?: string }

export class RuntimeError extends Error {
    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, RuntimeError.prototype);
    }
}

export class Cancel extends Error {
    constructor() {
        super("we have canceled");
        Object.setPrototypeOf(this, Cancel.prototype);
    }
}

export class ReturnException {
    ast: Ast<Annotations> & { type: "return" | "returnvoid" };
    constructor(ast: Ast<Annotations> & { type: "return" | "returnvoid" }) {
        this.ast = ast;
    }
}

type InterpreterCallbacks = {
    onDisplay(x: Value): Promise<void>
    onWaitForInput(): Promise<string>
    onStepPause(): Promise<void>
    onInfo(annotatedAst: Statement<Annotations>[], variables: VariableInfo): void
}

export type VariableInfo = { globals: Map<string, Value>, locals: Map<string, Value> | null };

export class Interpreter {
    globals: Map<string, Value>;
    locals: Map<string, Value> | null;
    callbacks: InterpreterCallbacks;
    shouldCancelReal: boolean = false;
    set shouldCancel(newValue: boolean) {
        this.shouldCancelReal = newValue;
        console.log("Set shouldCancel" + newValue)
    }
    shouldStep: boolean = false;
    annotatedAst: Statement<Annotations>[] = [];

    constructor(callbacks: InterpreterCallbacks) {
        this.callbacks = callbacks;
        this.globals = new Map();
        this.locals = null;

        this.globals.set("DISPLAY", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations>, params: Value[]) => {
                if (params.length !== 1) {
                    this.error(ast, "DISPLAY takes 1 argument");
                }
                await this.callbacks.onDisplay(cloneDeep(params[0]));
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
                const inputString = await this.callbacks.onWaitForInput();
                await this.maybeCancel();
                const num = Number(inputString);
                if (isNaN(num)) {
                    return { type: "string", value: inputString }
                } else {
                    return { type: "number", value: num };
                }
            })
        })

        this.globals.set("APPEND", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations> & { type: "call" }, params: Value[]) => {
                if (params.length !== 2) {
                    this.error(ast, "APPEND takes 2 arguments");
                }
                if (params[0].type !== "list") {
                    this.error(ast.paramaters[0], "must be a list");
                }
                params[0].value.push(params[1]);

                return { type: "void" };
            })
        })

        this.globals.set("LENGTH", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations> & { type: "call" }, params: Value[]) => {
                if (params.length !== 1) {
                    this.error(ast, "LENGTH takes 1 argument");
                }
                if (params[0].type !== "list") {
                    this.error(ast.paramaters[0], "must be a list");
                }


                return { type: "number", value: params[0].value.length };
            })
        })

        this.globals.set("REMOVE", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations> & { type: "call" }, params: Value[]) => {
                if (params.length !== 2) {
                    this.error(ast, "REMOVE takes 2 arguments");
                }
                if (params[0].type !== "list") {
                    this.error(ast.paramaters[0], "must be a list");
                }
                if (params[1].type !== "number" || !Number.isInteger(params[1].value)) {
                    this.error(ast.paramaters[1], "must be an integer");
                }
                const list: Array<Value> = params[0].value;
                const index: number = params[1].value;

                if (index <= 0) this.error(ast.paramaters[1], "must be >= 1");
                if (index > list.length) this.error(ast, "index bigger than list length");

                const removed = list.splice(index - 1, 1);

                return removed[0];
            })
        })

        this.globals.set("INSERT", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations> & { type: "call" }, params: Value[]) => {
                if (params.length !== 2) {
                    this.error(ast, "INSERT takes 3 arguments");
                }
                if (params[0].type !== "list") {
                    this.error(ast.paramaters[0], "must be a list");
                }
                if (params[1].type !== "number" || !Number.isInteger(params[1].value)) {
                    this.error(ast.paramaters[1], "must be an integer");
                }
                const list: Array<Value> = params[0].value;
                const index: number = params[1].value;

                if (index <= 0) this.error(ast.paramaters[1], "must be >= 1");
                if (index > list.length + 1) this.error(ast, "index bigger than list length");

                list.splice(index - 1, 0, params[3]);

                return { type: "void" };
            })
        })

        this.globals.set("RANDOM", {
            type: "procedure",
            builtin: true,
            call: (async (ast: Ast<Annotations> & { type: "call" }, params: Value[]) => {
                if (params.length !== 2) {
                    this.error(ast, "RANDOM takes 2 arguments");
                }
                if (params[0].type !== "number" || !Number.isInteger(params[0].value)) {
                    this.error(ast.paramaters[0], "must be an integer");
                }
                if (params[1].type !== "number" || !Number.isInteger(params[1].value)) {
                    this.error(ast.paramaters[1], "must be an integer");
                }
                const a = params[0].value;
                const b = params[1].value;

                return { type: "number", value: Math.floor(Math.random() * (b - a + 1) + a) };
            })
        })
    }


    async assign(ast: AssignableExpression<Annotations>, value: Value) {
        if (ast.type === "variable") {
            if (!this.locals || this.globals.has(ast.name)) {
                this.globals.set(ast.name, value);
            } else {
                this.locals.set(ast.name, value);
            }
        } else {
            const index = (await this.expectType(ast.index, "number")).value;

            const list = (await this.expectType(ast.list, "list")).value;

            if (!Number.isInteger(index)) this.error(ast.index, "must be an integer");
            if (index <= 0) this.error(ast.index, "must be >= 1");
            if (index > list.length) this.error(ast, "index bigger than list length");

            list[index - 1] = value;
        }
    }

    interpret(asts: Statement<Annotations>[]) {
        this.annotatedAst = cloneDeep(asts);
        return this.runBlock(this.annotatedAst).catch(x => {
            if (x instanceof ReturnException) {
                this.error(x.ast, "cannot return outside procedure");
            } else {
                throw x;
            }
        });
    }

    async maybeCancel(): Promise<void> {
        if (this.shouldCancelReal) {
            this.shouldCancelReal = false;
            throw new Cancel();
        }
    }

    broadcastInfo() {
        this.callbacks.onInfo(cloneDeep(this.annotatedAst), {
            globals: cloneDeep(this.globals),
            locals: cloneDeep(this.locals),
        });
    }

    async step(ast: Ast<Annotations>): Promise<void> {
        ast.isRunning = true;
        this.broadcastInfo();
        if (ast.type !== "procedure" && this.shouldStep) await this.callbacks.onStepPause();
        ast.isRunning = false;
    }

    error(expr: Ast<Annotations>, message: string): never {
        expr.error = message;
        console.error(message);
        this.broadcastInfo();
        throw new Error(message);
    }

    async expectType<T extends Value["type"]>(expr: Expression<Annotations>, type: T): Promise<Value & { type: T }> {
        const value = await this.evaluate(expr);
        if (value.type === type) {
            return value as Value & { type: T };
        } else {
            this.error(expr, `must be a ${type}`)
        }
    }

    async runBlock(block: Statement<Annotations>[]): Promise<void> {
        for (let stat of block) {
            await this.step(stat);
            await this.run(stat);
        }
        this.broadcastInfo();
    }

    async run(ast: Statement<Annotations>): Promise<void> {
        await this.maybeCancel();
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
            await this.evaluate(ast.expr);
        } else if (ast.type === "foreach") {
            const list = (await this.expectType(ast.list, "list")).value;
            for (const x of list) {
                await this.assign(ast.itemvar, x);
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "procedure") {
            await this.assign({ type: "variable", name: ast.name }, {
                type: "procedure",
                builtin: false,
                ast
            });
        } else if (ast.type === "repeattimes") {
            const n = (await this.expectType(ast.times, "number")).value;
            if (!Number.isInteger(n)) this.error(ast.times, "must be an integer");
            if (n < 0) this.error(ast.times, "must be positive");

            for (let i = 0; i < n; i++) {
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "repeatuntil") {
            let isFirstTime = true;
            while (true) {
                // runBlock will step on the first time through
                if (!isFirstTime) {
                    await this.step(ast);
                }
                isFirstTime = false;
                const condition = (await this.expectType(ast.condition, "boolean")).value;
                if (condition) break;
                await this.runBlock(ast.block);
            }
        } else if (ast.type === "breakpoint") {
            this.shouldStep = true;
            await this.step(ast);
        } else if (ast.type === "return") {
            throw new ReturnException(ast);
        } else if (ast.type === "returnvoid") {
            throw new ReturnException(ast);
        }
    }

    async evaluate(ast: Expression<Annotations>): Promise<Value> {
        await this.maybeCancel();
        if (ast.type === "operator") {
            if (ast.operator === "!=" || ast.operator === "=") {
                const lhs = await this.evaluate(ast.lhs);
                const rhs = await this.evaluate(ast.rhs);
                const equals = isequal(lhs, rhs);

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
            const num = await this.expectType(ast.value, "number");
            return { type: "number", value: -num.value };
        } else if (ast.type === "variable") {
            const value = this.locals?.get(ast.name) ?? this.globals.get(ast.name);
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
            if (procedure.builtin) {
                return await procedure.call(ast, paramaters);
            } else {
                const nparams = procedure.ast.paramaters.length;

                const oldLocals = this.locals;
                this.locals = new Map();
                if (paramaters.length !== nparams) {
                    this.error(ast, `should have ${nparams} paramaters`);
                }
                for (let i = 0; i < nparams; i++) {
                    this.locals.set(procedure.ast.paramaters[i], paramaters[i]);
                }
                try {
                    await this.runBlock(procedure.ast.block);
                } catch (e) {
                    if (e instanceof ReturnException) {
                        if (e.ast.type === "returnvoid") {
                            return { type: "void" }
                        } else {
                            return await this.evaluate(e.ast.value);
                        }
                    } else {
                        throw e;
                    }
                } finally {
                    this.locals = oldLocals;
                }
                return { type: "void" }
            }
        }
        this.error(ast, `can't handle ${ast.type}`);
    }
}