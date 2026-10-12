import { Circle, Minus, Square } from "lucide-react";
import { constrain45 } from "@/svg-core";
import { ToolId } from "@/store/4-editor";
import { constrainSquare, createShapeTool } from "./1-shape-tool-factory";

export const rectangleTool = createShapeTool({
    id: ToolId.rectangle,
    label: 'Rectangle',
    shortcut: 'r',
    icon: Square,
    hint: 'Drag to draw. Shift: square, Alt: from center',
    constrain: constrainSquare,
    create: (id, a, b, attrs) => ({
        id,
        kind: 'rect',
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
        rx: 0,
        ry: 0,
        attrs,
    }),
});

export const ellipseTool = createShapeTool({
    id: ToolId.ellipse,
    label: 'Ellipse',
    shortcut: 'o',
    icon: Circle,
    hint: 'Drag to draw. Shift: circle, Alt: from center',
    constrain: constrainSquare,
    create: (id, a, b, attrs) => {
        const rx = Math.abs(b.x - a.x) / 2;
        const ry = Math.abs(b.y - a.y) / 2;
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        return Math.abs(rx - ry) < 1e-9
            ? { id, kind: 'circle', cx, cy, r: rx, attrs }
            : { id, kind: 'ellipse', cx, cy, rx, ry, attrs };
    },
});

export const lineTool = createShapeTool({
    id: ToolId.line,
    label: 'Line',
    shortcut: 'l',
    icon: Minus,
    hint: 'Drag to draw. Shift: 45 degree steps, Alt: from center',
    constrain: constrain45,
    create: (id, a, b, attrs) => ({ id, kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, attrs }),
});
