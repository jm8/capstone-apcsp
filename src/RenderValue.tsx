import React from "react";
import { Value } from "./language/run";

function valueToString(value: Value, hideQuotes: boolean = false): string {
    if (value.type === "void") {
        return "[void]"
    } else if (value.type === "procedure") {
        return "[procedure]"
    } else if (value.type === "list") {
        let res = "[";
        let sep = "";
        for (const x of value.value) {
            res += sep;
            res += valueToString(x);
            sep = ", ";
        }
        res += "]";
        return res;
    } else if (value.type === "string") {
        if (hideQuotes) return value.value;
        return JSON.stringify(value.value)
    } else {
        return value.value.toString();
    }
}

export default function RenderValue({ value, hideQuotes = true }: { hideQuotes?: boolean, value: Value }) {
    return <span>{valueToString(value, hideQuotes)}</span>
}