import { Token } from "./ast";
import { tokenize } from "./tokenizer";

it("does ids and keywords", () => {
    expect(tokenize("IF x abc123 UNTIL")).toEqual<Token[]>([
        { type: "IF" },
        { type: "variable", name: "x" },
        { type: "variable", name: "abc123" },
        { type: "UNTIL" }
    ])
});

it("does numbers", () => {
    expect(tokenize("12.5 0.3 .6 -125 -.94 -4.60")).toEqual<Token[]>([
        { type: "number", value: 12.5 },
        { type: "number", value: 0.3 },
        { type: "number", value: 0.6 },
        { type: "number", value: -125 },
        { type: "number", value: -0.94 },
        { type: "number", value: -4.6 },
    ])
});

it("does symbols", () => {
    expect(tokenize("<=<--<+[,=!=")).toEqual<Token[]>([
        { type: "<=" },
        { type: "<-" },
        { type: "-" },
        { type: "<" },
        { type: "+" },
        { type: "[" },
        { type: "," },
        { type: "=" },
        { type: "!=" }
    ])
});

it("does symbol errors", () => {
    expect(() => tokenize("!")).toThrowError("Unknown token starting with '!'")
})