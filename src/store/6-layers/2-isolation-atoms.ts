import { type Getter, atom } from "jotai";
import { atomWithProxy } from "jotai-valtio";
import { type SvgDoc, type SvgNode, findNode, groupPathIds, isCompoundPath } from "@/svg-core";
import { isolationScopeOf } from "@/tools/0-shared/4-group-units";
import { docState } from "../3-document";
import { isolatedGroupIdAtom, isolationStackAtom, setSelectionAtom } from "../4-editor/2-selection-atoms";

/** The Valtio document as a Jotai atom, so derived atoms update when the document changes */
export const docProxyAtom = atomWithProxy(docState);

/** Isolated ids that still name a node (undo or a reload can remove one) */
export function validIsolationScope(doc: SvgDoc, ids: readonly string[]): string[] {
    return ids.filter((id) => findNode(doc, id));
}

/** Isolated objects for event handlers; reads the live document, so it never lags behind an edit */
export function getIsolationScope(get: Getter): string[] {
    return validIsolationScope(docState.doc, get(isolatedGroupIdAtom));
}

/** True when both lists hold the same ids, ignoring order */
export function sameIsolationIds(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    const ids = new Set(b);
    return a.every((id) => ids.has(id));
}

/**
 * Nodes a marquee or Select all may pick: top-level elements, the children of an isolated group,
 * or the isolated objects themselves when they are not groups.
 */
export function isolationRootChildren(doc: SvgDoc, isolated: string | readonly string[] | null): SvgNode[] {
    const scope = isolationScopeOf(isolated);
    if (!scope.length) {
        return doc.children;
    }
    const nodes: SvgNode[] = [];
    for (const id of scope) {
        const node = findNode(doc, id)?.node;
        if (!node) {
            continue;
        }
        if (node.kind === 'g') {
            nodes.push(...node.children);
        } else {
            nodes.push(node);
        }
    }
    return nodes;
}

/**
 * The array new elements are appended to: the isolated group, the parent of an isolated object,
 * or the document when the isolated objects do not share a parent.
 */
export function isolationInsertSiblings(doc: SvgDoc, scope: readonly string[]): SvgNode[] {
    if (scope.length === 1) {
        const loc = findNode(doc, scope[0]);
        if (loc?.node.kind === 'g') {
            return loc.node.children;
        }
        if (loc) {
            return loc.siblings;
        }
    }
    if (scope.length > 1) {
        const locs = scope.flatMap((id) => {
            const loc = findNode(doc, id);
            return loc ? [loc] : [];
        });
        const parentId = locs[0] ? locs[0].parents.at(-1)?.id ?? null : undefined;
        if (locs.length && locs.every((loc) => (loc.parents.at(-1)?.id ?? null) === parentId)) {
            return locs[0].siblings;
        }
    }
    return doc.children;
}

/** Group id passed to insertionParent, or null for the document */
export function isolationInsertParentId(doc: SvgDoc, scope: readonly string[]): string | null {
    if (scope.length === 1) {
        const loc = findNode(doc, scope[0]);
        if (!loc) {
            return null;
        }
        return loc.node.kind === 'g' ? loc.node.id : loc.parents.at(-1)?.id ?? null;
    }
    if (scope.length > 1) {
        const parentIds = scope.map((id) => findNode(doc, id)?.parents.at(-1)?.id ?? null);
        return parentIds.every((id) => id === parentIds[0]) ? parentIds[0] : null;
    }
    return null;
}

/**
 * Ids that stay fully visible, and isolated groups whose whole contents stay visible.
 * Ancestors of an isolated object stay undimmed so a group's opacity does not fade the object inside it.
 */
export function isolationPaint(doc: SvgDoc, scope: readonly string[]): { keep?: string; open?: string; } {
    if (!scope.length) {
        return {};
    }
    const keep = new Set<string>();
    const open = new Set<string>();
    for (const id of scope) {
        const loc = findNode(doc, id);
        if (!loc) {
            continue;
        }
        for (const parent of loc.parents) {
            keep.add(parent.id);
        }
        keep.add(loc.node.id);
        if (loc.node.kind === 'g') {
            open.add(loc.node.id);
        }
    }
    return {
        keep: keep.size ? [...keep].join(' ') : undefined,
        open: open.size ? [...open].join(' ') : undefined,
    };
}

//---------------------------------------------------------------------------

/** Display name of a layer: the element's id attribute, or its kind as in Illustrator ("<Path>", "<Group>") */
export function layerName(node: SvgNode): string {
    if (node.attrs.id) {
        return node.attrs.id;
    }
    switch (node.kind) {
        case 'g': return '<Group>';
        case 'path': return isCompoundPath(node) ? '<Compound Path>' : '<Path>';
        case 'rect': return '<Rect>';
        case 'circle': return '<Circle>';
        case 'ellipse': return '<Ellipse>';
        case 'line': return '<Line>';
        case 'polyline': return '<Polyline>';
        case 'polygon': return '<Polygon>';
        case 'passthrough': return `<${node.tag}>`;
    }
}

export type IsolationLevel = { id: string; label: string; };

/** Crumb id for one stack frame. A single object uses its node id; several objects share one crumb. */
export function isolationFrameId(frame: readonly string[], index: number): string {
    return frame.length === 1 ? frame[0] : `__isolation__:${index}`;
}

/**
 * Pushes `scope` onto the isolation stack.
 * A first entry on a single object also records the groups around it, so the breadcrumb can return to each one.
 * A later entry stays under the levels already open. Returns null when the active level is already `scope`.
 */
export function nestIsolationStack(doc: SvgDoc, stack: readonly (readonly string[])[], scope: readonly string[]): readonly (readonly string[])[] | null {
    const frame = [...scope];
    if (!frame.length || sameIsolationIds(stack.at(-1) ?? [], frame)) {
        return null;
    }
    const current = stack.at(-1);
    if (!current || !frame.every((id) => idInsideScope(doc, current, id))) {
        return frame.length === 1 ? ancestorFrames(doc, frame[0]) : [frame];
    }
    if (frame.length > 1) {
        return [...stack, frame];
    }
    return appendSingle(doc, stack, frame[0]);
}

/** Drops frames whose objects are gone, and every level nested inside a frame that is entirely gone */
export function pruneIsolationStack(doc: SvgDoc, stack: readonly (readonly string[])[]): readonly (readonly string[])[] {
    let changed = false;
    const next: (readonly string[])[] = [];
    for (const frame of stack) {
        const ids = frame.filter((id) => findNode(doc, id));
        if (!ids.length) {
            changed = true;
            break;
        }
        if (ids.length !== frame.length) {
            changed = true;
            next.push(ids);
        } else {
            next.push(frame);
        }
    }
    return changed || next.length !== stack.length ? next : stack;
}

/** One step out of isolation. Selects the objects of the level that was left. */
export function popIsolationStack(stack: readonly (readonly string[])[]): { stack: readonly (readonly string[])[]; select: readonly string[]; } | null {
    if (!stack.length) {
        return null;
    }
    return { stack: stack.slice(0, -1), select: stack[stack.length - 1] };
}

/**
 * Breadcrumb jump. `target` null leaves isolation entirely.
 * Otherwise the stack keeps that frame and selects the objects of the level directly inside it.
 */
export function jumpIsolationStack(stack: readonly (readonly string[])[], target: string | null): { stack: readonly (readonly string[])[]; select: readonly string[]; } | null {
    if (!stack.length) {
        return null;
    }
    if (target === null) {
        return { stack: [], select: stack[0] };
    }
    const index = stack.findIndex((frame, i) => isolationFrameId(frame, i) === target);
    if (index < 0 || index === stack.length - 1) {
        return null;
    }
    return { stack: stack.slice(0, index + 1), select: stack[index + 1] };
}

/** One crumb per isolation level, outermost first. A missing object is left out; an empty level is skipped. */
export function isolationLevels(doc: SvgDoc, stack: readonly (readonly string[])[]): IsolationLevel[] {
    const levels: IsolationLevel[] = [];
    for (let index = 0; index < stack.length; index++) {
        const frame = stack[index];
        const nodes = frame.flatMap((id) => {
            const node = findNode(doc, id)?.node;
            return node ? [node] : [];
        });
        if (!nodes.length) {
            continue;
        }
        const only = frame.length === 1 ? nodes[0] : undefined;
        levels.push({
            id: only ? only.id : isolationFrameId(frame, index),
            label: nodes.length === 1 ? layerName(nodes[0]) : `${nodes.length} objects`,
        });
    }
    return levels;
}

function idInsideScope(doc: SvgDoc, scope: readonly string[], id: string): boolean {
    if (scope.includes(id)) {
        return true;
    }
    const parents = groupPathIds(doc, id);
    return scope.some((parent) => parents.includes(parent));
}

/** The groups around `id`, then `id`, each as its own isolation level */
function ancestorFrames(doc: SvgDoc, id: string): readonly (readonly string[])[] {
    return [...groupPathIds(doc, id).map((parent) => [parent]), [id]];
}

/** Appends `id` under the active level, including groups that sit between that level and `id` */
function appendSingle(doc: SvgDoc, stack: readonly (readonly string[])[], id: string): readonly (readonly string[])[] | null {
    if (stack.some((frame) => frame.length === 1 && frame[0] === id)) {
        return null;
    }
    const current = stack.at(-1)!;
    if (current.includes(id)) {
        return [...stack, [id]];
    }
    const parents = groupPathIds(doc, id);
    let anchor = -1;
    for (const scopeId of current) {
        const index = parents.indexOf(scopeId);
        if (index > anchor) {
            anchor = index;
        }
    }
    const between = parents.slice(anchor + 1).filter((parent) => !stack.some((frame) => frame.length === 1 && frame[0] === parent));
    return [...stack, ...between.map((parent) => [parent]), [id]];
}

/** One crumb per open isolation level, outermost first */
export const isolationChainAtom = atom(
    (get): IsolationLevel[] => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        return isolationLevels(doc, get(isolationStackAtom));
    }
);

/** Isolated objects for rendering (reactive to document changes) */
export const isolationScopeAtom = atom(
    (get): string[] => {
        const doc = get(docProxyAtom).doc as unknown as SvgDoc;
        return validIsolationScope(doc, get(isolatedGroupIdAtom));
    }
);

//---------------------------------------------------------------------------

/**
 * Isolated objects the user collapsed in the layers tree.
 * Entering isolation clears this, so the new root starts expanded.
 */
export const isolationCollapsedAtom = atom<ReadonlySet<string>>(new Set<string>());

/** The Isolation Mode row is expanded when several objects are isolated; they are its children */
export const isolationManyOpenAtom = atom(true);

/** Isolates the given objects: everything else is dimmed and cannot be picked. Clears the selection. A level already open gains another one. */
export const enterIsolationAtom = atom(
    null,
    (get, set, ids: string | readonly string[]) => {
        const scope = validIsolationScope(docState.doc, typeof ids === 'string' ? [ids] : ids);
        const next = nestIsolationStack(docState.doc, get(isolationStackAtom), scope);
        if (next) {
            set(isolationStackAtom, next);
            set(setSelectionAtom, []);
            set(isolationCollapsedAtom, new Set<string>());
            set(isolationManyOpenAtom, true);
        }
    }
);

/** Leaves the current isolation for the parent level, or the top level. The objects that were left become selected. Returns false when not isolated. */
export const exitIsolationLevelAtom = atom(
    null,
    (get, set): boolean => {
        const left = popIsolationStack(get(isolationStackAtom));
        if (!left) {
            return false;
        }
        set(isolationStackAtom, left.stack);
        set(setSelectionAtom, [...left.select]);
        return true;
    }
);

/** Breadcrumbs: returns to an earlier isolation level, or leaves isolation when `target` is null */
export const exitIsolationToAtom = atom(
    null,
    (get, set, target: string | null) => {
        const next = jumpIsolationStack(get(isolationStackAtom), target);
        if (!next) {
            return;
        }
        set(isolationStackAtom, next.stack);
        set(setSelectionAtom, [...next.select]);
    }
);
