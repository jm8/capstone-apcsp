import { useEffect } from "react";
import React from "react";
import { useState } from "react";
import { CodeBlock } from "./CodeBlock";
import { Statement } from "./language/ast";
import { Annotations, Cancel, Interpreter, RuntimeError, Value, VariableInfo } from "./language/run";
import RenderValue from "./RenderValue";
import "./Running.css"
import Variables from "./Variables";
import { Console, ConsoleLine } from "./Console";



export default function Running({ code, asts: unAnnotated, onClose }:
    { code: string, asts: Statement[], onClose: () => void }) {


    const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
    const [interpreter, setInterpreter] = useState<Interpreter | null>(null);
    const [annotated, setAnnotated] = useState<Statement<Annotations>[]>(unAnnotated);
    const [nextStep, setNextStep] = useState<(() => void) | null>(null);
    const [variables, setVariables] = useState<VariableInfo>({ globals: new Map(), locals: null });
    type OnInput = ((x: string) => void) | null;
    const [onInput, setOnInput] = useState<OnInput>(null);

    const cancel = (interpreter: Interpreter | null) => {
        if (onInput) {
            onInput("")
            setOnInput(null);
        }
        if (interpreter) interpreter.shouldCancel = true;
        setNextStep(null);
        setInterpreter(null);
        setAnnotated(unAnnotated);
    }

    const onRun = (shouldStep: boolean) => {
        setConsoleLines([]);
        const newInterpreter = new Interpreter({
            async onDisplay(x: Value) { setConsoleLines(old => [...old, { type: "display", value: x }]) },
            onWaitForInput() {
                return new Promise<string>(resolve => {
                    setOnInput((oldOnInput: OnInput) => (x: string) => {
                        setConsoleLines(old => [...old, { type: "input", value: x }]);
                        setOnInput(null);
                        resolve(x);
                    })
                })
            },
            onInfo(annotated: Statement<Annotations>[], variables: VariableInfo) {
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
                setNextStep(null);
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
            {nextStep && !onInput && interpreter && <>
                <button onClick={e => { interpreter.shouldStep = false; nextStep() }}>Continue</button>
                <button onClick={e => nextStep()}>Step</button>
            </>}
        </div>
        <CodeBlock asts={annotated} />
        <Variables variables={variables} />
        <Console displayed={consoleLines} onInput={onInput} />

    </div>)
}