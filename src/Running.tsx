import { useState } from "react";
import CodeBlock from "./CodeBlock";
import { Ast, Statement } from "./language/ast";
import { Annotations, Interpreter, Value } from "./language/run";
import { tokenize } from "./language/tokenizer";
import "./Running.css"

export default function Running({ code, asts, onClose }:
    { code: string, asts: Statement<Annotations>[], onClose: () => void }) {

    const [interpreter, setInterpreter] = useState<Interpreter>(null!);
    const [displayed, setDisplayed] = useState<Value[]>([]);

    const onRun = () => {
        setDisplayed([]);
        const newInterpreter = new Interpreter({
            async onDisplay(x: Value) { setDisplayed([...displayed, x]) },
            onInput() {
                return new Promise(resolve => {
                    resolve(prompt("Input") ?? "");
                })
            }
        });
        setInterpreter(newInterpreter)
        newInterpreter.runBlock(asts);
    }

    return (<div className="Running">
        <button onClick={e => onClose()}>Close</button>
        <button onClick={e => onRun()}>Run</button>
        <CodeBlock asts={asts} />
        <ul>
            {displayed.map((x, i) => <li>{x.type === "void" ? "[void]" : x.type === "procedure" ? "[procedure]" : x.value.toString()}</li>)}
        </ul>
    </div>)
}