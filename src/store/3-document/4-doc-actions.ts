import { snapshot } from "valtio";
import {
    type GroupNode, type Matrix, type Padding, type FitOptions, type SvgDoc, type SvgNode, type ViewBox,
    docToParentMatrix, findNode, fitRectMatrix, isShapeNode, newNodeId, nodeOwnMatrix, parentsMatrix, parseSvg,
    parseSvgFragment, serializeNodes, serializeSvg, setPresentation, shapeToPath, topmostIds, transformNode, translateMatrix,
    viewBoxAround, walkNodes, makeFmt, isIdentity, multiply, scaleMatrix, reuseNodeIds, type Rect, scaleAround, getPresentation, isNoneAttr,
} from "@/svg-core";
import { appSettings } from "../1-ui-settings";
import { docPrecision, docState } from "./1-doc-store";
import { type ChangeOrigin, commitHistory, resetHistory } from "./2-doc-history";
import { nodesDocBBox } from "./3-doc-geometry";

// Loading and saving

type LoadOptions = {
    origin?: ChangeOrigin;
    fileName?: string;
    resetUndo?: boolean;
    keepIds?: boolean;           // reuse ids of the current document by position (source edits)
};

export function loadSvgText(text: string, options: LoadOptions = {}): { ok: true; } | { ok: false; error: string; } {
    const rv = parseSvg(text);
    if (!rv.ok) {
        return rv;
    }
    if (options.keepIds) {
        reuseNodeIds(docState.doc.children, rv.doc.children);
    }
    docState.doc = rv.doc;
    if (options.fileName) {
        docState.fileName = options.fileName;
    }
    if (options.resetUndo) {
        resetHistory(options.origin ?? 'load');
    } else {
        commitHistory({ origin: options.origin ?? 'load', mergeKey: options.origin === 'code' ? 'code' : undefined });
    }
    return { ok: true };
}

export function docToText(doc: SvgDoc = snapshot(docState).doc as SvgDoc): string {
    return serializeSvg(doc, { precision: docPrecision() });
}

/** Whole document as exported (file save, download, Copy SVG source); the Options > Export settings apply here only */
export function exportDocText(): string {
    return serializeSvg(snapshot(docState).doc as SvgDoc, { precision: docPrecision(), includeNoneValues: appSettings.exportSvg.includeNoneValues });
}

export function nodesToText(ids: readonly string[]): string {
    const doc = snapshot(docState).doc as SvgDoc;
    const nodes = topmostIds(doc, ids).map((id) => findNode(doc, id)!.node);
    return serializeNodes(nodes, { precision: docPrecision() });
}

/** Inserts elements from SVG text (a whole document or a fragment) at the top of the stacking order; returns the new ids */
export function insertSvgMarkup(text: string): string[] | undefined {
    const parsed = parseSvg(text);
    const nodes = parsed.ok ? parsed.doc.children : parseSvgFragment(text);
    if (!nodes?.length) {
        return;
    }
    docState.doc.children.push(...nodes);
    commitHistory();
    return nodes.map((n) => n.id);
}

// Node lookup and replacement

/** Proxy of the node (mutations re-render it) */
export function getNodeProxy(id: string): SvgNode | undefined {
    return findNode(docState.doc, id)?.node;
}

//---------------------------------------------------------------------------

/** Plain copy of the node as it is now (for gestures that recompute from the original on every move) */
export function cloneNode(id: string): SvgNode | undefined {
    const loc = findNode(docState.doc, id);
    return loc && structuredClone(snapshot(loc.node) as SvgNode);
}

export function replaceNode(id: string, next: SvgNode): void {
    const loc = findNode(docState.doc, id);
    if (loc) {
        loc.siblings[loc.index] = next;
    }
}

export function addNode(node: SvgNode): void {
    docState.doc.children.push(node);
}

//---------------------------------------------------------------------------
// Transforms

export type NodeOriginals = Map<string, SvgNode>;

export function captureOriginals(ids: readonly string[]): NodeOriginals {
    const doc = docState.doc;
    const rv: NodeOriginals = new Map();
    for (const id of topmostIds(doc, ids)) {
        const n = cloneNode(id);
        n && rv.set(id, n);
    }
    return rv;
}

/** Applies a document-space matrix to the captured originals (no history commit) */
export function applyDocMatrix(originals: NodeOriginals, mDoc: Matrix): void {
    const precision = docPrecision();
    for (const [id, original] of originals) {
        const loc = findNode(docState.doc, id);
        if (!loc) {
            continue;
        }
        const mParent = docToParentMatrix(mDoc, parentsMatrix(loc.parents));
        loc.siblings[loc.index] = transformNode(original, mParent, precision);
    }
}

export function restoreOriginals(originals: NodeOriginals): void {
    for (const [id, original] of originals) {
        replaceNode(id, structuredClone(original));
    }
}

export function moveNodes(ids: readonly string[], dx: number, dy: number): void {
    applyDocMatrix(captureOriginals(ids), translateMatrix(dx, dy));
    commitHistory({ mergeKey: `nudge:${ids.join(',')}` });
}

//---------------------------------------------------------------------------
// Structure

export function deleteNodes(ids: readonly string[]): void {
    const doc = docState.doc;
    for (const id of topmostIds(doc, ids)) {
        const loc = findNode(doc, id);
        loc?.siblings.splice(loc.index, 1);
    }
    commitHistory();
}

/** Copies nodes right after their originals; returns the new ids in the same order */
export function duplicateNodes(ids: readonly string[], offset = 0): string[] {
    const doc = docState.doc;
    const rv: string[] = [];
    for (const id of topmostIds(doc, ids)) {
        const loc = findNode(doc, id);
        if (!loc) {
            continue;
        }
        let copy = withNewIds(structuredClone(snapshot(loc.node) as SvgNode));
        if (offset) {
            copy = transformNode(copy, docToParentMatrix(translateMatrix(offset, offset), parentsMatrix(loc.parents)), docPrecision());
        }
        loc.siblings.splice(loc.index + 1, 0, copy);
        rv.push(copy.id);
    }
    return rv;
}

function withNewIds(node: SvgNode): SvgNode {
    node.id = newNodeId();
    if (node.attrs.id) {
        node.attrs.id = `${node.attrs.id}-copy`;
    }
    if (node.kind === 'g') {
        node.children = node.children.map(withNewIds);
    }
    return node;
}

//---------------------------------------------------------------------------

export type ReorderDirection = 'front' | 'forward' | 'backward' | 'back';

export function reorderNodes(ids: readonly string[], direction: ReorderDirection): void {
    const doc = docState.doc;
    const set = new Set(topmostIds(doc, ids));
    const groups = new Map<SvgNode[], SvgNode[]>(); // siblings array -> selected nodes in it

    for (const id of set) {
        const loc = findNode(doc, id);
        if (loc) {
            const list = groups.get(loc.siblings) ?? [];
            list.push(loc.node);
            groups.set(loc.siblings, list);
        }
    }

    for (const [siblings, selected] of groups) {
        const plain = siblings.slice();
        const isSel = (n: SvgNode) => selected.includes(n);
        let next: SvgNode[];
        switch (direction) {
            case 'front':
                next = [...plain.filter((n) => !isSel(n)), ...plain.filter(isSel)];
                break;
            case 'back':
                next = [...plain.filter(isSel), ...plain.filter((n) => !isSel(n))];
                break;
            case 'forward':
                next = plain.slice();
                for (let i = next.length - 2; i >= 0; i--) {
                    if (isSel(next[i]) && !isSel(next[i + 1])) {
                        [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    }
                }
                break;
            case 'backward':
                next = plain.slice();
                for (let i = 1; i < next.length; i++) {
                    if (isSel(next[i]) && !isSel(next[i - 1])) {
                        [next[i], next[i - 1]] = [next[i - 1], next[i]];
                    }
                }
                break;
        }
        const snapshotNodes = next.map((n) => structuredClone(snapshot(n) as SvgNode));
        siblings.splice(0, siblings.length, ...snapshotNodes);
    }
    commitHistory();
}

//---------------------------------------------------------------------------

/** Wraps nodes that share a parent into a new group; returns the group id */
export function groupNodes(ids: readonly string[]): string | undefined {
    const doc = docState.doc;
    const top = topmostIds(doc, ids);
    const locs = top.map((id) => findNode(doc, id)!).filter(Boolean);
    if (!locs.length || locs.some((l) => l.siblings !== locs[0].siblings)) {
        return;
    }
    const siblings = locs[0].siblings;
    const indices = locs.map((l) => l.index).sort((a, b) => a - b);
    const children = indices.map((i) => structuredClone(snapshot(siblings[i]) as SvgNode));
    const group: GroupNode = { id: newNodeId(), kind: 'g', attrs: {}, children };

    for (let k = indices.length - 1; k >= 0; k--) {
        siblings.splice(indices[k], 1);
    }
    siblings.splice(indices[indices.length - 1] - (indices.length - 1), 0, group);
    commitHistory();
    return group.id;
}

/** Replaces groups by their children; the group transform is pushed down into each child */
export function ungroupNodes(ids: readonly string[]): string[] {
    const doc = docState.doc;
    const rv: string[] = [];
    for (const id of ids) {
        const loc = findNode(doc, id);
        if (!loc || loc.node.kind !== 'g') {
            rv.push(id);
            continue;
        }
        const g = snapshot(loc.node) as GroupNode;
        const gm = nodeOwnMatrix(g);
        const children = g.children.map(
            (c) => {
                const child = structuredClone(c) as SvgNode;
                return isIdentity(gm) ? child : transformNode(child, gm, docPrecision());
            }
        );
        loc.siblings.splice(loc.index, 1, ...children);
        rv.push(...children.map((c) => c.id));
    }
    commitHistory();
    return rv;
}

//---------------------------------------------------------------------------

export function convertToPath(ids: readonly string[]): void {
    let changed = false;
    for (const id of ids) {
        const loc = findNode(docState.doc, id);
        if (loc && isShapeNode(loc.node)) {
            loc.siblings[loc.index] = shapeToPath(snapshot(loc.node) as typeof loc.node, docPrecision());
            changed = true;
        }
    }
    changed && commitHistory();
}

//---------------------------------------------------------------------------
// Presentation attributes

export function setNodesPresentation(ids: readonly string[], prop: string, value: string | undefined, mergeKey?: string): void {
    // With "include none values" off, a `none` paint is not written; the attribute is removed instead
    const write = value !== undefined && !appSettings.exportSvg.includeNoneValues && isNoneAttr(prop, value) ? undefined : value;
    for (const id of ids) {
        const node = getNodeProxy(id);
        node && setPresentation(node.attrs, prop, write);
    }
    commitHistory({ mergeKey: mergeKey ?? `style:${prop}` });
}

/** Presentation attributes that Copy style and Paste style carry over */
export const STYLE_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'] as const;

export type StyleSnapshot = Record<string, string | undefined>;

/** Elements that carry the paint: the node itself, or for a group all of its elements (groups have no paint of their own) */
function styleLeaves(node: SvgNode): SvgNode[] {
    return node.kind === 'g' ? node.children.flatMap(styleLeaves) : [node];
}

/** Style of the first element of the node (Copy style) */
export function readNodeStyle(id: string): StyleSnapshot | undefined {
    const node = getNodeProxy(id);
    const leaf = node && styleLeaves(node)[0];
    if (!leaf) {
        return;
    }
    const rv: StyleSnapshot = {};
    for (const prop of STYLE_PROPS) {
        rv[prop] = getPresentation(leaf.attrs, prop);
    }
    return rv;
}

/** Writes the style to every element of the selection; properties missing in the style are removed */
export function writeNodesStyle(ids: readonly string[], style: StyleSnapshot): void {
    for (const id of topmostIds(docState.doc, ids)) {
        const node = getNodeProxy(id);
        for (const leaf of node ? styleLeaves(node) : []) {
            for (const prop of STYLE_PROPS) {
                setPresentation(leaf.attrs, prop, style[prop]);
            }
        }
    }
    commitHistory();
}

/** Mirrors the nodes across the vertical (axis 'x') or horizontal (axis 'y') line through the center of their bbox */
export function flipNodes(ids: readonly string[], axis: 'x' | 'y'): void {
    const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, ids);
    if (!bbox) {
        return;
    }
    const origin = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
    applyDocMatrix(captureOriginals(ids), axis === 'x' ? scaleAround(-1, 1, origin) : scaleAround(1, -1, origin));
    commitHistory();
}

/** Path and shape elements have anchors that the Points tool can edit */
export function isPointEditable(id: string): boolean {
    const node = getNodeProxy(id);
    return !!node && (node.kind === 'path' || isShapeNode(node));
}

export function setNodeNumber(id: string, key: string, value: number): void {
    const node = getNodeProxy(id) as Record<string, unknown> | undefined;
    if (node && typeof node[key] === 'number') {
        node[key] = value;
        commitHistory({ mergeKey: `geom:${id}:${key}` });
    }
}

//---------------------------------------------------------------------------
// ViewBox

export function setViewBox(vb: ViewBox | null): void {
    docState.doc.viewBox = vb;
    commitHistory({ mergeKey: 'viewBox' });
}

export function setRootAttr(name: string, value: string | undefined): void {
    if (value === undefined || value === '') {
        delete docState.doc.rootAttrs[name];
    } else {
        docState.doc.rootAttrs[name] = value;
    }
    commitHistory({ mergeKey: `root:${name}` });
}

/** Moves and scales nodes so that their combined document bbox becomes the given one */
export function setNodesBBox(ids: readonly string[], target: Partial<Rect>): void {
    const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, ids);
    if (!bbox) {
        return;
    }
    const next = { ...bbox, ...target };
    const sx = bbox.width ? next.width / bbox.width : 1;
    const sy = bbox.height ? next.height / bbox.height : 1;
    const m = multiply(translateMatrix(next.x, next.y), multiply(scaleMatrix(sx, sy), translateMatrix(-bbox.x, -bbox.y)));
    applyDocMatrix(captureOriginals(ids), m);
    commitHistory({ mergeKey: `bbox:${ids.join(',')}` });
}

/** Scales and moves nodes so that their bbox fits into the viewBox minus padding */
export function fitNodesToViewBox(ids: readonly string[], options: FitOptions): boolean {
    const doc = docState.doc;
    const vb = doc.viewBox;
    const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, ids);
    if (!vb || !bbox) {
        return false;
    }
    applyDocMatrix(captureOriginals(ids), fitRectMatrix(bbox, vb, options));
    commitHistory();
    return true;
}

export function fitViewBoxToNodes(ids: readonly string[], padding: Padding): boolean {
    const bbox = nodesDocBBox(snapshot(docState).doc as SvgDoc, ids);
    if (!bbox) {
        return false;
    }
    setViewBox(roundViewBox(viewBoxAround(bbox, padding)));
    return true;
}

function roundViewBox(vb: ViewBox): ViewBox {
    const f = makeFmt(docPrecision());
    return { x: +f(vb.x), y: +f(vb.y), width: +f(vb.width), height: +f(vb.height) };
}

export function topLevelIds(): string[] {
    return docState.doc.children.map((n) => n.id);
}

export function allLeafIds(): string[] {
    const rv: string[] = [];
    walkNodes(docState.doc.children, (n) => { n.kind !== 'g' && rv.push(n.id); });
    return rv;
}