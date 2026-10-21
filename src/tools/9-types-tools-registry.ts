import { type ToolDef } from "./9-types-tool-def";
import { type ToolId, registerToolDeactivate } from "@/store/4-editor";

import { handTool } from "./tool-1-hand";
import { selectTool } from "./tool-2-select";
import { pointsTool } from "./tool-3-points";
import { ellipseTool, lineTool, rectangleTool } from "./tool-4-shapes/2-shape-tools";
import { penTool } from "./tool-5-pen";

export function getTool(id: ToolId): ToolDef {
    return byId.get(id) ?? selectTool;
}

export function toolByShortcut(key: string): ToolDef | undefined {
    const k = key.toLowerCase();
    return TOOLS.find((t) => t.shortcut === k || t.altShortcut === k);
}

/** Keys that select a tool, as displayed: ["V", "1"] */
export function toolShortcuts(tool: ToolDef): string[] {
    return [tool.shortcut, tool.altShortcut].flatMap((k) => (k ? [k.toUpperCase()] : []));
}

//---------------------------------------------------------------------------

/** Toolbar order; shortcuts and the command palette are generated from this list */
export const TOOLS: readonly ToolDef[] = [
    handTool,
    selectTool,
    pointsTool,
    rectangleTool,
    ellipseTool,
    lineTool,
    penTool,
];

const byId = new Map<ToolId, ToolDef>(TOOLS.map((t) => [t.id, t]));

for (const tool of TOOLS) {
    const hook = tool.onDeactivate;
    if (hook) {
        registerToolDeactivate(tool.id, (get, set) => hook({ get, set }));
    }
}
