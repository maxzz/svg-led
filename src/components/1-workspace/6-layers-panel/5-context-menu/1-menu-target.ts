import { type SvgDoc, defsClassId, findNode, isDefsItemOf, isShapeNode, parseDefsItemId, plainName, styleAt } from "@/svg-core";

/**
 * What a layers row stands for, as far as the context menu cares. Commands are registered per kind:
 * - `shape`: a path or a basic shape (rect, circle, ellipse, line, polyline, polygon);
 * - `element`: any other document node (a group, a `<defs>`, text, image, ...);
 * - `defs`: a `<defs>` element of the document;
 * - `defs-class`: a class of a `<style>` element inside `<defs>`;
 * - `defs-style`: a `<style>` element inside `<defs>`;
 * - `defs-element`: any other element inside `<defs>`.
 */
export type LayersMenuTarget =
    | { kind: 'shape'; id: string; }
    | { kind: 'element'; id: string; }
    | { kind: 'defs'; id: string; }
    | { kind: 'defs-class'; id: string; defsId: string; styleIndex: number; name: string; }
    | { kind: 'defs-style'; id: string; defsId: string; index: number; }
    | { kind: 'defs-element'; id: string; defsId: string; index: number; };

export type LayersMenuTargetKind = LayersMenuTarget['kind'];

export type LayersMenuTargetOf<K extends LayersMenuTargetKind> = Extract<LayersMenuTarget, { kind: K; }>;

//---------------------------------------------------------------------------

/** Id of the row under a right-clicked element: a node id, or a `<defs>` item id (see `defsItemId`); undefined outside rows */
export function menuTargetIdOf(el: Element): string | undefined {
    const row = el.closest<HTMLElement>('[data-layer-id], [data-defs-element], [data-defs-item]');
    const d = row?.dataset;
    if (!d) {
        return undefined;
    }
    if (d.layerId) {
        return d.layerId;
    }
    if (d.defsElement) {
        return d.defsElement;
    }
    if (d.defsItem && d.defsId && d.defsStyle !== undefined && d.defsName) {
        return defsClassId(d.defsId, Number(d.defsStyle), d.defsName);
    }
    return undefined;
}

/** The target that `id` names in `doc`; undefined when it no longer exists */
export function resolveMenuTarget(doc: SvgDoc, id: string): LayersMenuTarget | undefined {
    const parsed = parseDefsItemId(id);
    if (!parsed) {
        const node = findNode(doc, id)?.node;
        if (!node) {
            return undefined;
        }
        if (isShapeNode(node) || node.kind === 'path') {
            return { kind: 'shape', id };
        }
        return node.kind === 'passthrough' && plainName(node.tag).toLowerCase() === 'defs' ? { kind: 'defs', id } : { kind: 'element', id };
    }

    if (!isDefsItemOf(doc, id)) {
        return undefined;
    }
    const { defsId, part } = parsed;
    const cls = /^(\d+)\.(.+)$/.exec(part);
    if (cls) {
        return { kind: 'defs-class', id, defsId, styleIndex: Number(cls[1]), name: cls[2] };
    }
    const index = Number(part);
    const defs = findNode(doc, defsId)?.node;
    const isStyle = defs?.kind === 'passthrough' && !!styleAt(defs.inner, index);
    return isStyle ? { kind: 'defs-style', id, defsId, index } : { kind: 'defs-element', id, defsId, index };
}
