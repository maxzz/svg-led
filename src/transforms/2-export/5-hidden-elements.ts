import { getPresentation } from "@/svg-core";
import { type MarkupElement, type MarkupNode, parseMarkup, printSvgMarkup, rootElement } from "../0-markup/1-markup-tree";

/**
 * Removes the elements that are hidden in the panel (`display: none`, as an attribute or in the style), with everything
 * nested in them. The root element is kept. Returns the text as it was when nothing is removed.
 */
export function stripHiddenElements(svg: string): string {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return svg;
    }
    const root = rootElement(nodes);
    let changed = false;
    const visit = (list: MarkupNode[]): MarkupNode[] => list.filter((node) => {
        if (node.kind !== 'el') {
            return true;
        }
        if (node !== root && isHiddenElement(node)) {
            changed = true;
            return false;
        }
        node.children = visit(node.children);
        return true;
    });
    const rest = visit(nodes);
    return changed ? printSvgMarkup(rest) : svg;
}

/** The same test as the layers panel: the element's own `display` is `none` */
function isHiddenElement(el: MarkupElement): boolean {
    const attrs = Object.fromEntries(el.attrs.map((a) => [a.name, a.value]));
    return getPresentation(attrs, 'display')?.trim() === 'none';
}
