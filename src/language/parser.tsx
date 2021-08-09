import { Ast, Operator, Location } from './ast'

export class ParseError extends Error {
    location: Location;
    constructor(location: Location, message: string) {
        super(message);
        Object.setPrototypeOf(this, ParseError.prototype);

        this.location = location;
    }
}


export function parse(code: string): Ast[] {
    throw new ParseError({ line: 2, col: 3 }, "hmm");
}

