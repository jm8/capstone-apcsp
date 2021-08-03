import React, { useState } from 'react';
import Editor from './Editor';
import Running from './Running';
import { parse } from './language/parser'
import './App.css';
import { Ast } from './language/ast';

function App() {
  type Data =
    | { mode: "editing", code: string }
    | { mode: "running", code: string, ast: Ast };
  const [data, setData] = useState<Data>({ mode: "editing", code: "" });

  function onRun() {
    setData({
      mode: "running",
      code: data.code,
      ast: parse(data.code)
    })
  }
  let content;
  if (data.mode == "editing") {
    content = <Editor code={data.code} setCode={(code) => setData({ ...data, code })} onRun={onRun} />
  } else if (data.mode == "running") {
    content = <Running code={data.code} ast={data.ast} onClose={() => setData({ mode: "editing", code: data.code })} />
  }

  return (
    <div className="App">
      {content}
    </div>
  );
}

export default App;
