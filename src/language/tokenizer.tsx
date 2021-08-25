import { Keyword, keywords, Location, operators, symbols, Token } from "./ast";
import { ParseError } from "./parser";

export function tokenize(code: string): (Token & { location: Location })[] {
    let remainder = code;
    let result = [];
    let location = { line: 1, col: 1 };
    while (!remainder.match(/^\s*$/)) {
        const { text, token, whitespace } = firstToken(remainder);
        remainder = remainder.slice(text.length + whitespace.length);
        for (const c of whitespace) {
            if (c === "\n") { location.col = 1; location.line++; } else { location.col++; }
        }
        for (const c of text) {
            if (c === "\n") { location.col = 1; location.line++; } else { location.col++; }
        }
        result.push({ ...token, location });
    }
    return result;
}

function firstToken(code: string): { whitespace: string, text: string, token: Token } {
    let remainder = code;

    const whitespaceMatch = /^[\s\n]+/.exec(code);
    let whitespace = whitespaceMatch ? whitespaceMatch[0] : '';
    remainder = remainder.slice(whitespace.length);

    let text: string | undefined;
    let token: Token | undefined;
    // do numbers before symbols so negative numbers are parsed not as a negative symbol
    const numberMatch = /^[0-9]*\.?[0-9]+/.exec(remainder);
    if (numberMatch) {
        text = numberMatch[0];
        token = { type: "number", value: Number.parseFloat(numberMatch[0]) };
    }

    if (!text) {
        // sort them by length so that eg <- is found before <
        const symbolsSorted = [...operators, ...symbols].sort((a, b) => b.length - a.length)
        for (const sym of symbolsSorted) {
            if (remainder.startsWith(sym)) {
                text = sym;
                token = { type: sym }
                break;
            }
        }
    }

    if (!text) {
        const stringMatch = /^"(([^"\\]|(\\.))*)"/.exec(remainder);
        if (stringMatch) {
            text = stringMatch[0];
            const value = JSON.parse(stringMatch[0])
            token = { type: "string", value };
        }
    }

    if (!text) {
        const idMatch = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(remainder);
        if (idMatch) {
            text = idMatch[0];
            const keyword: Keyword | undefined = keywords.find((keyword) => keyword === text);
            if (keyword) {
                token = { type: keyword }
            }
            else if (text === "true" || text === "false") {
                token = { type: "boolean", value: text === "true" };
            } else {
                token = { type: "variable", name: text };
            }
        }
    }

    if (!text || !token) {
        throw new ParseError({ line: 1, col: 1 }, `Unknown token starting with '${remainder.charAt(0)}'`)
    }

    return { text, token, whitespace };
}