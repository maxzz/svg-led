import { isDeactivatedName } from "@/svg-core";
import { type MarkupElement, type MarkupNode, parseMarkup, printSvgMarkup } from "../0-markup/1-markup-tree";
import { type ExportStep, isEditorSource } from "./9-export-types";

/** Editor-only attribute that marks a locked element (see `LOCKED_ATTR` in the store); it has no meaning in an export */
const LOCKED_ATTR = 'data-locked';

/** Editor states are not part of the drawing: deactivated elements and lock marks are removed from the export */
export const internalStatesStep: ExportStep = {
    id: 'internal-states',
    label: 'Editor states removed (deactivated elements, lock marks)',
    enabled: (options) => !isEditorSource(options),
    apply: (svg) => stripInternalStates(svg),
};

//---------------------------------------------------------------------------

/**
 * Removes the deactivated elements, with everything nested in them, and the `data-locked` attributes.
 * An element whose content was only removed elements is removed too, so no empty shell is left behind.
 * The top-level elements (the root `<svg>`) are kept even when they end up empty.
 * Returns the text as it was when nothing is removed; text that is not well-formed is returned as it is.
 */
export function stripInternalStates(svg: string): string {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return svg;
    }
    const state = { changed: false };
    const { nodes: rest } = cleanNodes(nodes, state, true);
    return state.changed ? printSvgMarkup(rest) : svg;
}

/**
 * Cleans a list of nodes: drops deactivated elements, strips lock marks, and drops an element (when `isTop` is false)
 * that lost children here and has no content left. `dropped` says how many nodes of this list were removed.
 */
function cleanNodes(nodes: readonly MarkupNode[], state: { changed: boolean; }, isTop: boolean): { nodes: MarkupNode[]; dropped: number; } {
    const out: MarkupNode[] = [];
    let dropped = 0;

    for (const node of nodes) {
        if (node.kind !== 'el') {
            out.push(node);
            continue;
        }
        if (isDeactivatedName(node.name)) {
            dropped++;
            state.changed = true;
            continue;
        }
        const attrCount = node.attrs.length;
        node.attrs = node.attrs.filter((a) => a.name !== LOCKED_ATTR);
        if (node.attrs.length !== attrCount) {
            state.changed = true;
        }
        const inner = cleanNodes(node.children, state, false);
        node.children = inner.nodes;
        if (!isTop && inner.dropped > 0 && !hasContent(node)) {
            dropped++;
            state.changed = true;
            continue;
        }
        out.push(node);
    }
    return { nodes: out, dropped };
}

/** True when an element has something to show: an element, a CDATA section, or non-blank text */
function hasContent(el: MarkupElement): boolean {
    return el.children.some((c) => c.kind === 'el' || c.kind === 'cdata' || (c.kind === 'text' && c.text.trim() !== ''));
}
