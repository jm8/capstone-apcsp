import { Keyword, keywords, Location, operators, symbols, Token } from "./ast";
import { ParseError } from "./parser";

export function tokenize(code: string): Token[] {
    let remainder = code;
    let result = [];
    while (remainder.length > 0) {
        const { newRemainder, token } = firstToken(remainder);
        remainder = newRemainder;
        result.push(token);
    }
    return result;
}

function firstToken(code: string): { newRemainder: string, token: Token } {
    let remainder = code;

    const whitespaceMatch = /^\s+/.exec(code);
    let whitespaceLength;
    if (whitespaceMatch) {
        whitespaceLength = whitespaceMatch[0].length;
        remainder = remainder.slice(whitespaceMatch[0].length);
    } else {
        whitespaceLength = 0;
    }
    // do numbers before symbols so negative numbers are parsed not as a negative symbol
    const numberMatch = /^[-+]?[0-9]*\.?[0-9]+/.exec(remainder);
    if (numberMatch) {
        return { newRemainder: remainder.slice(numberMatch[0].length), token: { type: "number", value: Number.parseFloat(numberMatch[0]) } }
    }
    // sort them by length so that eg <- is found before <
    const symbolsSorted = [...operators, ...symbols].sort((a, b) => b.length - a.length)
    for (const sym of symbolsSorted) {
        if (remainder.startsWith(sym)) return { newRemainder: remainder.slice(sym.length), token: { type: sym } };
    }
    const idMatch = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(remainder);
    if (idMatch) {
        const id = idMatch[0];
        const keyword: Keyword | undefined = keywords.find((keyword) => keyword === id);
        if (keyword) {
            return { newRemainder: remainder.slice(id.length), token: { type: keyword } }
        }
        else {
            return { newRemainder: remainder.slice(id.length), token: { type: "variable", name: id } };
        }
    }
    throw new ParseError({ line: 1, col: 1 }, `Unknown token starting with '${remainder.charAt(0)}'`)
}
