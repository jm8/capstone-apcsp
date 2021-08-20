import { parse, parseExpression } from "./parser";
import { Interpreter, Value } from "./run";
import { tokenize } from "./tokenizer";

export async function parseAndEval(code: string): Promise<Value> {
    return await new Interpreter().evaluate(parseExpression(code));
}

it('can do 2 + 2', async () => {
    expect(await parseAndEval("2+2")).toEqual({ type: "number", value: 4 })
});

it('can index a list', async () => {
    expect(await parseAndEval("[2, 4, 6][2]")).toEqual({ type: "number", value: 4 })
});