import { type Attrs, fmtNum } from "@/svg-core";
import { type ToolStyleOptions } from "../1-types";

export function styleAttrs(o: ToolStyleOptions, strokeWidth: number, dashArray?: string): Attrs {
    return {
        fill: o.fill || 'none',
        stroke: o.stroke || 'none',
        'stroke-width': fmtNum(strokeWidth, 3),
        ...(dashArray ? { 'stroke-dasharray': dashArray } : {}),
    };
}
