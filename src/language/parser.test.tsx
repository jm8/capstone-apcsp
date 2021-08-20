import { Ast } from "./ast";
import { parse, parseExpression } from "./parser"

it("parses literals and variables", () => {
    expect(parseExpression("-12.5")).toEqual({ type: "number", value: -12.5 });
    expect(parseExpression("true")).toEqual({ type: "boolean", value: true });
    expect(parseExpression("_abc123")).toEqual({ type: "variable", name: "_abc123" });
})

it("parses arithmetic", () => {
    expect(parseExpression("a * 2 + b * 2")).toEqual<Ast>({
        type: 'operator',
        operator: "+",
        lhs: {
            type: 'operator',
            operator: '*',
            lhs: { type: "variable", name: 'a' },
            rhs: { type: 'number', value: 2 }
        },
        rhs: {
            type: 'operator',
            operator: '*',
            lhs: { type: "variable", name: 'b' },
            rhs: { type: 'number', value: 2 }
        }
    })
})

it("can assign to a variable", () => {
    expect(parse("x <- 2")).toEqual<Ast[]>([
        { type: "assign", lhs: { type: "variable", name: "x" }, rhs: { type: "number", value: 2 } }
    ])
})

it("can assign to list index", () => {
    expect(parse("x[2] <- 3")).toEqual([
        {
            type: "assign",
            lhs: {
                type: "subscript",
                list: {
                    type: "variable",
                    name: "x"
                },
                index: {
                    type: "number",
                    value: 2
                }
            },
            rhs: {
                type: "number",
                value: 3
            }
        }
    ])
})