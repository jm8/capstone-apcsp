import { Value, VariableInfo } from "./language/run";
import React from "react";
import RenderValue from "./RenderValue";

export default function Variables({ variables }: { variables: VariableInfo }) {
    return <div className="Variables">
        <h2>Variables</h2>
        <h3>Globals</h3>
        {Array.from(variables.globals.entries(), ([name, value]) =>
            !(value.type === "procedure" && value.builtin) && <div className="variable">
                <span className="variableName" key={name + "_key"}>{name}: </span>
                <span className="variableValue" key={name + "_value"}><RenderValue value={value} /></span>
            </div>
        )}
        {variables.locals && <><h3>Locals</h3>
            {Array.from(variables.locals.entries(), ([name, value]) =>
                !(value.type === "procedure" && value.builtin) && <div className="variable">
                    <span className="variableName" key={name + "_key"}>{name}: </span>
                    <span className="variableValue" key={name + "_value"}><RenderValue value={value} /></span>
                </div>
            )}</>}
    </div>
}