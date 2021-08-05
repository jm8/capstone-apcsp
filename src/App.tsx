import React, { useState } from 'react';
import Editor from './Editor';
import Running from './Running';
import { parse } from './language/parser'
import './App.css';
import { Ast } from './language/ast';

function App() {
  type Data =
    | { mode: "editing", code: string }
    | { mode: "running", code: string, asts: Ast[] };
  const [data, setData] = useState<Data>({ mode: "editing", code: "" });

  function onRun() {
    setData({
      mode: "running",
      code: data.code,
      asts: parse(data.code)
    })
  }
  let content;
  if (data.mode === "editing") {
    content = <Editor code={data.code} setCode={(code) => setData({ ...data, code })} onRun={onRun} />
  } else if (data.mode === "running") {
    content = <Running code={data.code} asts={data.asts} onClose={() => setData({ mode: "editing", code: data.code })} />
  }

  return (
    <div className="App">
      {content}
      <footer><div>Based on the AP® Computer Science Principles exam's <a href="https://apcentral.collegeboard.org/pdf/ap-computer-science-principles-exam-reference-sheet.pdf">reference sheet.</a></div><div>AP® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this site.</div></footer>
    </div>
  );
}

export default App;
