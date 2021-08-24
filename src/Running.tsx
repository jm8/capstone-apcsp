import { useEffect } from "react";
import React from "react";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Statement } from "./language/ast";
import { Annotations, Cancel, Interpreter, RuntimeError, Value } from "./language/run";
import RenderValue from "./RenderValue";
import "./Running.css"

export default function Running({ code, asts: unAnnotated, onClose }:
    { code: string, asts: Statement[], onClose: () => void }) {

    const [displayed, setDisplayed] = useState<Value[]>([]);
    const [interpreter, setInterpreter] = useState<Interpreter | null>(null);
    const [annotated, setAnnotated] = useState<Statement<Annotations>[]>(unAnnotated);
    const [nextStep, setNextStep] = useState<(() => void) | null>(null);
    const [variables, setVariables] = useState<Map<string, Value>>(new Map());
    const [error, setError] = useState<boolean>(false);

    const cancel = (interpreter: Interpreter | null) => {
        if (interpreter) interpreter.shouldCancel = true;
        setNextStep(null);
        setInterpreter(null);
        setAnnotated(unAnnotated);
    }

    const onRun = (shouldStep: boolean) => {
        setDisplayed([]);
        const newInterpreter = new Interpreter({
            async onDisplay(x: Value) { setDisplayed(displayed => [...displayed, x]) },
            onInput() {
                return new Promise(resolve => {
                    resolve(prompt("Input") ?? "");
                })
            },
            onInfo(annotated: Statement<Annotations>[], variables: Map<string, Value>) {
                setAnnotated(annotated);
                setVariables(variables);
            },
            onStepPause() {
                return new Promise<void>((resolve) => {
                    setNextStep(nextStep => resolve);
                })
            }
        });
        setInterpreter(newInterpreter);
        newInterpreter.shouldStep = shouldStep;
        newInterpreter.interpret(unAnnotated)
            .then(() => {
                cancel(null);
            })
            .catch((err) => {
                setError(true)
            })
    }

    return (<div className="Running">
        <div className="toolbar">
            <button onClick={e => {
                cancel(interpreter);
                onClose();
            }}>Close</button>
            {!interpreter && <button onClick={e => onRun(false)}>Run</button>}
            {!interpreter && <button onClick={e => onRun(true)}>Step through</button>}
            {interpreter && <button onClick={e => { cancel(interpreter) }}>Stop</button>}
            {nextStep && interpreter && <button onClick={e => { interpreter.shouldStep = false; nextStep() }}>Continue</button>}
            {nextStep && <button onClick={e => nextStep()}>Step</button>}
        </div>
        <CodeBlock asts={annotated} />
        <pre>
            {JSON.stringify(annotated, null, 2)}
        </pre>
        <dl>
            {Array.from(variables.entries(), ([name, value]) =>
                !(value.type === "procedure" && value.builtin) && <>
                    <dt key={name + "_key"}>{name}</dt>
                    <dd key={name + "_value"}><RenderValue value={value} /></dd>
                </>
            )}
        </dl>
        <ul>
            {displayed.map((x, i) => <li key={i}><RenderValue value={x} /></li>)}
        </ul>
    </div>)
}