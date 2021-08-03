import { Ast } from "./language/ast";

export default function Running({ code, ast, onClose }:
    { code: string, ast: Ast, onClose: () => void }) {

    return (<div>
        <button onClick={e => onClose()}>Close</button>
        <pre><code>{code}</code></pre>
        <pre><code>{JSON.stringify(ast, undefined, 2)}</code></pre>
    </div>)
}