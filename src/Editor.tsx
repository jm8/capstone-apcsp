import { ParseError } from "./language/parser";


import "./Editor.css";
import AceEditor from "react-ace";

export default function Editor({ code, setCode, onRun, error }:
    { code: string, setCode: (code: string) => void, onRun: () => void, error: ParseError | null }) {


    return (<div className="Editor">
        <div className="toolbar"><button onClick={() => onRun()}>Run</button></div>
        <div className="codeErrorMessageContainer">
            <AceEditor className="code" fontSize={18} value={code} onChange={(x) => setCode(x)}></AceEditor>
            {error && <div className="errorMessage">{error.message}</div>}
        </div>
    </div>
    )
}