import { Value } from "./language/run";
import React from "react";
import RenderValue from "./RenderValue";

export default function Variables({ variables }: { variables: Map<string, Value> }) {
    return <div className="Variables">
        {Array.from(variables.entries(), ([name, value]) =>
            !(value.type === "procedure" && value.builtin) && <div className="variable">
                <span className="variableName" key={name + "_key"}>{name}: </span>
                <span className="variableValue" key={name + "_value"}><RenderValue value={value} /></span>
            </div>
        )}
    </div>
}