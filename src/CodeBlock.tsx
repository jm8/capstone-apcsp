import { Ast, Statement } from "./language/ast";

import "./CodeBlock.css";
import React from "react";
import { Annotations } from "./language/run";

export function CodeBlock({ asts }: { asts: Statement<Annotations>[] }) {
    return (<div className="CodeBlock">
        {asts.map((x, i) => <AstElement key={i} ast={x} />)}
    </div>)
}

export function AstElement({ ast, parens = "never" }: { ast: Ast<Annotations>, parens?: "always" | "ifoperator" | "never" }) {
    if (ast.error) {
        return <span className="errorContainer">
            <div className="errorText">{ast.error}</div>
            <span className="errorElement"><AstElementWithoutError ast={ast} parens={parens} />
            </span>
        </span>
    } else {
        return <AstElementWithoutError ast={ast} parens={parens} />
    }
}

function AstElementWithoutError({ ast, parens = "never" }: { ast: Ast<Annotations>, parens?: "always" | "ifoperator" | "never" }) {

    const render = (subast: Ast) => <AstElement ast={subast} />

    const alwaysInParens = (subast: Ast) => <AstElement ast={subast} parens="always" />
    const inParensIfOperator = (subast: Ast) => <AstElement ast={subast} parens="ifoperator" />

    const parensIfAlways = (x: JSX.Element) => {
        if (parens === "always") {
            return <span><span className="alt">(</span><span className="oval">{x}</span><span className="alt"></span></span>
        } else {
            return x;
        }
    }
    const parensIfOperator = (x: JSX.Element) => {
        if (parens === "ifoperator" || parens === "always") {
            return <span><span className="alt">(</span><span className="oval">{x}</span><span className="alt"></span></span>
        } else {
            return x;
        }
    }
    const renderBlock = (block: Ast[]) => (<div className="indentedBlock"><span className="alt">{"{"}</span>{block.map((x, i) => {
        return React.cloneElement(render(x), { key: i })
    })}<span className="alt">{"}"}</span></div>)

    // todo: &thinsp; might not be best
    const boxList = (items: Ast[] | string[]) => {
        const toComponent = (x: Ast | string) => {
            if (typeof x === "string") {
                return x;
            } else {
                return inParensIfOperator(x);
            }
        }
        let content;
        if (items.length === 0) {
            content = <>&thinsp;</>
        } else {
            content = items.map((x, i) => <>{i > 0 && ", "}{toComponent(x)}</>)
        }
        return <span className="box"><span className="alt">[</span>{content}<span className="alt">]</span></span>;
    }

    const arrowOnLeft = (el: JSX.Element, running: boolean = false) => {
        if (running) {
            return <div className="running">
                <div className="runningArrow">{">"}</div>
                {el}
            </div>
        } else {
            return el;
        }
    }

    if (ast.type === "assign") {
        return arrowOnLeft(<div className="rounded">{render(ast.lhs)} &larr; {render(ast.rhs)}</div>, ast.isRunning);
    } else if (ast.type === "breakpoint") {
        return arrowOnLeft(<div className="rounded">BREAKPOINT</div>, ast.isRunning);
    }
    else if (ast.type === "operator") {
        const opString = ast.operator === "!=" ? "≠"
            : ast.operator === ">=" ? "≥"
                : ast.operator === "<=" ? "≤"
                    : ast.operator;
        return parensIfOperator(<span>{inParensIfOperator(ast.lhs)} {opString} {inParensIfOperator(ast.rhs)}</span>)
    }
    else if (ast.type === "not") {
        return parensIfOperator(<span>NOT {inParensIfOperator(ast.value)}</span>)
    }
    else if (ast.type === "negate") {
        return parensIfOperator(<span>-{inParensIfOperator(ast.value)}</span>)
    }
    else if (ast.type === "if") {
        return <div className="filled">
            {arrowOnLeft(<div className="condition">IF {alwaysInParens(ast.condition)}</div>, ast.isRunning)}
            {renderBlock(ast.iftrue)}
        </div >
    }
    else if (ast.type === "ifelse") {
        return <div className="filled">
            {arrowOnLeft(<div className="condition">IF {alwaysInParens(ast.condition)}</div>, ast.isRunning)}
            {renderBlock(ast.iftrue)}
            <div className="condition">ELSE</div>
            {renderBlock(ast.iffalse)}
        </div>
    }
    else if (ast.type === "repeattimes") {
        return <div className="filled">
            {arrowOnLeft(<div className="condition">REPEAT {inParensIfOperator(ast.times)} TIMES</div>, ast.isRunning)}
            {renderBlock(ast.block)}
        </div>
    }
    else if (ast.type === "repeatuntil") {
        return <div className="filled">
            {arrowOnLeft(<div className="condition">REPEAT UNTIL {alwaysInParens(ast.condition)}</div>, ast.isRunning)}
            {renderBlock(ast.block)}
        </div>
    }
    else if (ast.type === "list") {
        return boxList(ast.items)
    }
    else if (ast.type === "subscript") {
        return parensIfAlways(<span>{render(ast.list)}&thinsp;<span className="alt">[</span><span className="box">{render(ast.index)}</span><span className="alt">]</span></span>)
    }
    else if (ast.type === "foreach") {
        return <div className="filled">
            {arrowOnLeft(<div className="condition">FOR EACH {inParensIfOperator(ast.itemvar)} IN {inParensIfOperator(ast.list)}</div>, ast.isRunning)}
            {renderBlock(ast.block)}
        </div>
    }
    else if (ast.type === "procedure") {
        return <div className="filled">
            <div className="condition">PROCEDURE {ast.name} {boxList(ast.paramaters)}</div>
            {renderBlock(ast.block)}
        </div>
    }
    else if (ast.type === "return") {
        return arrowOnLeft(<div className="rounded">RETURN <span className="box">{render(ast.value)}</span></div>, ast.isRunning)
    }
    else if (ast.type === "returnvoid") {
        return arrowOnLeft(<div className="rounded">RETURN</div>, ast.isRunning)
    }
    else if (ast.type === "call") {
        return parensIfOperator(<span>{render(ast.procedure)} {ast.paramaters.length > 0 && boxList(ast.paramaters)}</span>)
    }
    else if (ast.type === "exprstat") {
        return arrowOnLeft(<div className="rounded">{render(ast.expr)}</div>, ast.isRunning)
    }
    else if (ast.type === "string") {
        return parensIfAlways(<span>&quot;{ast.value}&quot;</span>) // todo: fix
    }
    else if (ast.type === "number") {
        return parensIfAlways(<span>{ast.value.toString()}</span>)
    }
    else if (ast.type === "boolean") {
        return parensIfAlways(<span>{ast.value ? "true" : "false"}</span>)
    }
    else if (ast.type === "variable") {
        return parensIfAlways(<span>{ast.name}</span>)
    }
    return <span>??</span>;
}