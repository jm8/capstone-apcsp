import CodeBlock from "./CodeBlock";
import { Ast } from "./language/ast";
import { tokenize } from "./language/tokenizer";
import "./Running.css"

export default function Running({ code, asts, onClose }:
    { code: string, asts: Ast[], onClose: () => void }) {

    return (<div className="Running">
        <button onClick={e => onClose()}>Close</button>
        <CodeBlock asts={asts} />
    </div>)
}