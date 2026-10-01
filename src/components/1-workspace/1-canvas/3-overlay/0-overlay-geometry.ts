import {
    type Matrix, type Point, type Rect, type SubPath, type SvgDoc, type SvgNode, applyMatrix, findNode, localBBox, multiply,
    nodeCtm, nodeOutline, subpathsToPathData, transformSubpaths,
} from "@/svg-core";
import { domBBoxFallback } from "@/store/3-document";
import { type Viewport } from "@/store/4-editor";

/** Document -> screen */
export function viewportMatrix(vp: Viewport): Matrix {
    return [vp.zoom, 0, 0, vp.zoom, vp.x, vp.y];
}

/** Node-local -> screen */
export function nodeScreenMatrix(doc: SvgDoc, vp: Viewport, id: string): Matrix | undefined {
    const loc = findNode(doc, id);
    return loc && multiply(viewportMatrix(vp), nodeCtm(loc));
}

/** Outline path data in screen coordinates; groups and unknown elements use their transformed bbox */
export function outlineScreenD(node: SvgNode, m: Matrix): string {
    const outline = nodeOutline(node);
    if (outline) {
        const subs = structuredClone(outline);
        transformSubpaths(subs, m);
        return subpathsToPathData(subs, 2);
    }
    const b = localBBox(node, domBBoxFallback);
    return b ? rectPolygonD(b, m) : '';
}

export function rectPolygonD(r: Rect, m: Matrix): string {
    const pts = [
        applyMatrix(m, { x: r.x, y: r.y }),
        applyMatrix(m, { x: r.x + r.width, y: r.y }),
        applyMatrix(m, { x: r.x + r.width, y: r.y + r.height }),
        applyMatrix(m, { x: r.x, y: r.y + r.height }),
    ];
    return `M${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L')} Z`;
}

export function screenSubpaths(subpaths: SubPath[], m: Matrix): SubPath[] {
    const rv = structuredClone(subpaths);
    transformSubpaths(rv, m);
    return rv;
}

export function pt(p: Point): string {
    return `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
}
