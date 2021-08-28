import React, { useRef, useState } from "react";
import { Value } from "./language/run";
import RenderValue from "./RenderValue";
import "./Console.css";
export type ConsoleLine = { type: "input", value: string } | { type: "display", value: Value }
export function Console({ displayed, onInput }: { displayed: ConsoleLine[], onInput: ((x: string) => void) | null }) {
    const [input, setInput] = useState("")
    return <div className="Console">
        <h2>Console</h2>
        <ul className="displayed">
            {displayed.map((x, i) => <li key={i}>
                {x.type === "display" && <RenderValue hideQuotes value={x.value} />}
                {x.type === "input" && <span style={{ color: "blue" }}>{x.value}</span>}
            </li>)}
        </ul>
        {onInput && <form onSubmit={e => { e.preventDefault(); onInput(input); setInput("") }} className="inputcontainer">
            <input autoFocus={true} value={input} onChange={e => setInput(e.target.value)} type="text" className="inputbox" /><input type="submit" value="Submit" />
        </form>}
    </div>
}
