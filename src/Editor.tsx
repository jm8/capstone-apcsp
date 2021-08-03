export default function Editor({ code, setCode, onRun }:
    { code: string, setCode: (code: string) => void, onRun: () => void }) {

    return (<div>
        <div><button onClick={() => onRun()}>Run</button></div>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} />
    </div>
    )
}