import { useEffect } from "react";
import { useState } from "react";
import CodeBlock from "./CodeBlock";
import { Statement } from "./language/ast";
import { Annotations, Interpreter, Value } from "./language/run";
import "./Running.css"

export default function Running({ code, asts: unAnnotated, onClose }:
    { code: string, asts: Statement[], onClose: () => void }) {

    const [displayed, setDisplayed] = useState<Value[]>([]);
    const [interpreter, setInterpreter] = useState<Interpreter | null>(null);
    const [annotated, setAnnotated] = useState<Statement<Annotations>[]>(unAnnotated);
    const [nextStep, setNextStep] = useState<(() => void) | null>(null);

    useEffect(() => {
        return function cleanup() {
            if (interpreter) interpreter.shouldCancel = true;
        }
    }, [interpreter]);

    const onRun = () => {
        setDisplayed([]);
        const newInterpreter = new Interpreter({
            async onDisplay(x: Value) { setDisplayed(displayed => [...displayed, x]) },
            onInput() {
                return new Promise(resolve => {
                    resolve(prompt("Input") ?? "");
                })
            },
            onStepPause(annotated: Statement<Annotations>[]) {
                setAnnotated(annotated);
                return new Promise<void>((resolve) => {
                    // setTimeout(resolve, 100)
                    setNextStep(nextStep => resolve);
                })
            }
        });
        setInterpreter(newInterpreter);
        newInterpreter.interpret(unAnnotated)
            .then(() => {
                setNextStep(null)
                setAnnotated(unAnnotated);
            })
    }

    return (<div className="Running">
        <button onClick={e => onClose()}>Close</button>
        <button onClick={e => onRun()}>Run</button>
        {nextStep && <button onClick={e => nextStep()}>Step</button>}
        <CodeBlock asts={annotated} />
        <ul>
            {displayed.map((x, i) => <li key={i}>{x.type === "void" ? "[void]" : x.type === "procedure" ? "[procedure]" : x.value.toString()}</li>)}
        </ul>
    </div>)
}