import CodeBlock from "./CodeBlock";
import { Ast } from "./language/ast";

export default function Running({ code, asts, onClose }:
    { code: string, asts: Ast[], onClose: () => void }) {

    return (<div>
        <button onClick={e => onClose()}>Close</button>
        <pre><code>{code}</code></pre>
        <pre><code>{JSON.stringify(asts, undefined, 2)}</code></pre>
        <CodeBlock asts={asts} />
    </div>)
}