import { type Point, type ShapeNode } from "../1-model/1-types";
import { constrain45 } from "../5-anchors/2-anchor-ops";

//---------------------------------------------------------------------------

/** Parametric handle of a native shape, in shape-local coordinates */
export type ShapeHandle = {
    key: string;
    x: number;
    y: number;
    role: 'corner' | 'radius' | 'point';
};

export function getShapeHandles(node: ShapeNode): ShapeHandle[] {
    switch (node.kind) {
        case 'rect': {
            const { x, y, width: w, height: h } = node;
            return [
                { key: 'nw', x, y, role: 'corner' },
                { key: 'ne', x: x + w, y, role: 'corner' },
                { key: 'se', x: x + w, y: y + h, role: 'corner' },
                { key: 'sw', x, y: y + h, role: 'corner' },
                { key: 'rx', x: x + Math.min(node.rx, w / 2), y, role: 'radius' },
            ];
        }
        case 'circle':
            return [{ key: 'r', x: node.cx + node.r, y: node.cy, role: 'radius' }];
        case 'ellipse':
            return [
                { key: 'rx', x: node.cx + node.rx, y: node.cy, role: 'radius' },
                { key: 'ry', x: node.cx, y: node.cy + node.ry, role: 'radius' },
            ];
        case 'line':
            return [
                { key: 'p1', x: node.x1, y: node.y1, role: 'point' },
                { key: 'p2', x: node.x2, y: node.y2, role: 'point' },
            ];
        case 'polyline':
        case 'polygon':
            return node.points.map((p, i) => ({ key: `p${i}`, x: p.x, y: p.y, role: 'point' }));
    }
}

//---------------------------------------------------------------------------

/**
 * Applies a handle drag. Call it on a copy of the shape as it was when the drag started,
 * so every move starts from the original geometry. `constrain` is Shift.
 */
export function applyShapeHandle(node: ShapeNode, key: string, p: Point, constrain: boolean): void {
    switch (node.kind) {
        case 'rect': {
            if (key === 'rx') {
                const rx = Math.max(0, Math.min(p.x - node.x, node.width / 2, node.height / 2));
                node.rx = rx;
                node.ry = rx;
                return;
            }
            // the opposite corner stays fixed
            const fixed = {
                x: key.includes('w') ? node.x + node.width : node.x,
                y: key.includes('n') ? node.y + node.height : node.y,
            };
            let w = p.x - fixed.x;
            let h = p.y - fixed.y;
            if (constrain) {
                const s = Math.max(Math.abs(w), Math.abs(h));
                w = Math.sign(w || 1) * s;
                h = Math.sign(h || 1) * s;
            }
            node.x = Math.min(fixed.x, fixed.x + w);
            node.y = Math.min(fixed.y, fixed.y + h);
            node.width = Math.abs(w);
            node.height = Math.abs(h);
            return;
        }
        case 'circle':
            node.r = Math.hypot(p.x - node.cx, p.y - node.cy);
            return;
        case 'ellipse': {
            if (key === 'rx') {
                node.rx = Math.abs(p.x - node.cx);
                if (constrain) node.ry = node.rx;
            } else {
                node.ry = Math.abs(p.y - node.cy);
                if (constrain) node.rx = node.ry;
            }
            return;
        }
        case 'line': {
            if (key === 'p1') {
                const q = constrain ? constrain45({ x: node.x2, y: node.y2 }, p) : p;
                node.x1 = q.x;
                node.y1 = q.y;
            } else {
                const q = constrain ? constrain45({ x: node.x1, y: node.y1 }, p) : p;
                node.x2 = q.x;
                node.y2 = q.y;
            }
            return;
        }
        case 'polyline':
        case 'polygon': {
            const i = Number(key.slice(1));
            if (node.points[i]) {
                const prev = node.points[i - 1] ?? node.points[i + 1];
                node.points[i] = constrain && prev ? constrain45(prev, p) : { x: p.x, y: p.y };
            }
            return;
        }
    }
}
