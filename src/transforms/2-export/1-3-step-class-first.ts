import { type MarkupElement, type MarkupAttr, parseMarkup, printSvgMarkup, walkElements } from "../0-markup/1-markup-tree";
import { type ExportStep } from "./9-export-types";

//---------------------------------------------------------------------------

/** Every non-PNG export lists the class attribute first in each element, then id, then the rest, with long-string attributes (`d`, `points`, ...) last (`className` for React is the same attribute) */
export const classFirstStep: ExportStep = {
    id: 'attribute-order',
    label: 'class, then id, then the other attributes',
    apply: (svg) => classFirst(svg),
};

//---------------------------------------------------------------------------

/** Orders the attributes of each element: class, id, then the rest; returns the text as it was when no element changes */
export function classFirst(svg: string): string {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return svg;
    }
    let changed = false;
    walkElements(nodes, (el) => {
        if (orderAttrs(el)) {
            changed = true;
        }
    });
    return changed ? printSvgMarkup(nodes) : svg;
}

/**
 * Attributes whose values are long strings (path data, point lists, animation and filter value lists, embedded image data,
 * inline CSS). They go after every other attribute.
 */
const LONG_STRING_ATTRS = new Set([
    'd',                                  // path
    'points',                             // polygon, polyline
    'values', 'keyTimes', 'keySplines', 'keyPoints', // animate, animateMotion, animateTransform
    'tableValues', 'kernelMatrix',        // feFuncX, feConvolveMatrix
    'href', 'xlink:href',                 // image, use, ... (data URIs are long)
    'style',
]);

/** Rank of an attribute in the export order: class first, id second, long strings last, everything else in its own order between */
function rank({ name }: MarkupAttr): number {
    if (name === 'class' || name === 'className') return 0;
    if (name === 'id') return 1;
    if (LONG_STRING_ATTRS.has(name)) return 3;
    return 2;
}

/** True when the element's attributes were out of order and have been reordered */
function orderAttrs(el: MarkupElement): boolean {
    const sorted = [...el.attrs].sort((a, b) => rank(a) - rank(b)); // sort is stable, so the rest keep their order
    const changed = sorted.some((a, i) => a !== el.attrs[i]);
    if (changed) {
        el.attrs = sorted;
    }
    return changed;
}
