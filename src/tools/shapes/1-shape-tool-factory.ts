import { type ComponentType } from "react";
import { type Point, type ShapeNode, newNodeId } from "@/svg-core";
import { commitHistory, docState, getNodeProxy, replaceNode } from "@/store/3-document";
import { type ToolId, selectionAtom, setActiveToolAtom, setSelectionAtom, toolLockedAtom } from "@/store/4-editor";
import { type CornerRadius, newShapeStyleAtom } from "@/store/2-persist";
import { type NewShapeKind, type ToolDef } from "../1-types";
import { MODIFIERS, isMod } from "../3-modifiers";
import { docTolerance, snapDoc } from "../0-shared/2-tool-helpers";
import { styleAttrs } from "../0-shared/4-style-attrs";

const M = MODIFIERS.shapes;

type ShapeToolConfig = {
    id: ToolId;
    label: string;
    shortcut: string;
    icon: ComponentType<{ className?: string; }>;
    hint: string;
    /** Element kind created; the panel shows the new-shape properties that apply to it */
    kind: NewShapeKind;
    /** Geometry from the drag start and the current point (both already constrained/centered) */
    create: (id: string, a: Point, b: Point, attrs: Record<string, string>, corner: CornerRadius) => ShapeNode;
    /** Shift behavior: square, circle or 45 degree line */
    constrain: (a: Point, b: Point) => Point;
};

/** Rectangle, ellipse and line share the same drag-to-draw gesture */
export function createShapeTool(config: ShapeToolConfig): ToolDef {
    let drawing: { id: string; start: Point; corner: CornerRadius; } | null = null;

    return {
        id: config.id,
        label: config.label,
        shortcut: config.shortcut,
        icon: config.icon,
        hint: config.hint,
        cursor: 'crosshair',
        newShapeKind: config.kind,

        onPointerDown({ get, set }, e) {
            const start = snapDoc(e.doc);
            const id = newNodeId();
            const style = get(newShapeStyleAtom);
            const corner: CornerRadius = { rx: style.rx, ry: style.ry };
            docState.doc.children.push(config.create(id, start, start, styleAttrs(style), corner));
            set(setSelectionAtom, [id]);
            drawing = { id, start, corner };
        },

        onPointerMove(_ctx, e) {
            if (!drawing) {
                return;
            }
            let b = snapDoc(e.doc);
            if (isMod(e, M.constrain)) {
                b = config.constrain(drawing.start, b);
            }
            let a = drawing.start;
            if (isMod(e, M.fromCenter)) {
                a = { x: 2 * drawing.start.x - b.x, y: 2 * drawing.start.y - b.y };
            }
            const node = getNodeProxy(drawing.id);
            node && replaceNode(drawing.id, config.create(drawing.id, a, b, { ...node.attrs }, drawing.corner));
        },

        onPointerUp({ get, set }, e) {
            if (!drawing) {
                return;
            }
            const { id, start } = drawing;
            drawing = null;

            const tooSmall = Math.hypot(e.doc.x - start.x, e.doc.y - start.y) < docTolerance(get, 2);
            if (tooSmall) {
                const list = docState.doc.children;
                const index = list.findIndex((n) => n.id === id);
                index >= 0 && list.splice(index, 1);
                set(selectionAtom, []);
                return;
            }

            commitHistory();
            if (!get(toolLockedAtom)) {
                set(setActiveToolAtom, 'select');
            }
        },
    };
}

export function constrainSquare(a: Point, b: Point): Point {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const s = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.x + Math.sign(dx || 1) * s, y: a.y + Math.sign(dy || 1) * s };
}