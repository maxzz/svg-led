import { Hand } from "lucide-react";
import { ToolId } from "@/store/4-editor";
import { type ToolDef } from "../1-types";

/** Panning itself is done by the canvas for every tool (Space, middle button); this tool makes the left button pan too */
export const handTool: ToolDef = {
    id: ToolId.hand,
    label: 'Hand',
    shortcut: 'h',
    icon: Hand,
    hint: () => 'Drag to pan · Wheel to zoom',
    cursor: 'grab',
};
