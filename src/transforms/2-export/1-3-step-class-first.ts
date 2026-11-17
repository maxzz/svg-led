import { type MarkupElement, type MarkupAttr, parseMarkup, printSvgMarkup, walkElements } from "../0-markup/1-markup-tree";
import { type ExportStep } from "./9-export-types";

//---------------------------------------------------------------------------

/** Every non-PNG export lists the class attribute first in each element, then id, then the rest (`className` for React is the same attribute) */
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

/** Rank of an attribute in the export order: class first, id second, everything else after in its own order */
function rank({ name }: MarkupAttr): number {
    if (name === 'class' || name === 'className') return 0;
    if (name === 'id') return 1;
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
