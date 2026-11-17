import { type MarkupElement, parseMarkup, printSvgMarkup, walkElements } from "../0-markup/1-markup-tree";
import { type ExportStep } from "./9-export-types";

/** Every non-PNG export puts the class attribute first in each element's attribute list (`className` for React is the same attribute) */
export const classFirstStep: ExportStep = {
    id: 'class-first',
    label: 'class attribute first on each element',
    apply: (svg) => classFirst(svg),
};

//---------------------------------------------------------------------------

/** Moves the class attribute of each element to the front of its attributes; returns the text as it was when no class has to move */
export function classFirst(svg: string): string {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return svg;
    }
    let changed = false;
    walkElements(nodes, (el) => {
        if (moveClassToFront(el)) {
            changed = true;
        }
    });
    return changed ? printSvgMarkup(nodes) : svg;
}

/** True when the element had a class attribute that was not first */
function moveClassToFront(el: MarkupElement): boolean {
    const i = el.attrs.findIndex((a) => a.name === 'class' || a.name === 'className');
    if (i <= 0) {
        return false;
    }
    const [attr] = el.attrs.splice(i, 1);
    el.attrs.unshift(attr);
    return true;
}
