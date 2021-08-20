import { parse, parseExpression } from "./parser";
import { Interpreter, Value } from "./run";

export async function parseAndEval(code: string): Promise<Value> {
    return await new Interpreter({
        async onDisplay(x: Value) { },
        async onInput() { return { type: "void" } }
    }).evaluate(parseExpression(code));
}

export async function runWithInput(code: string, inputs: Value[]): Promise<Value[]> {
    console.log("a")
    let inputIndex = 0;
    let displayed: Value[] = [];
    await new Interpreter({
        async onDisplay(x: Value) { displayed.push(x); console.log(displayed) },
        async onInput() { return inputs[inputIndex++] ?? { type: "void" } }
    }).runBlock(parse(code));
    return displayed;
}

it('can do 2 + 2', async () => {
    expect(await parseAndEval("2+2")).toEqual({ type: "number", value: 4 })
});

it('can index a list', async () => {
    expect(await parseAndEval("[2, 4, 6][2]")).toEqual({ type: "number", value: 4 })
});

it('can display a variable', async () => {
    debugger;
    const displayed = await runWithInput("x <- 2\nDISPLAY(x)\nDISPLAY(x+1)", []);
    console.log("b")
    console.log(displayed);
    expect(displayed).toEqual<Value[]>([{ type: "number", value: 2 }, { type: "number", value: 3 }])
})