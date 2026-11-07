import { type SvgNode } from "../1-model/1-types";
import { parseSvgFragment } from "../2-parse/1-parse-svg";
import { classRulesOf } from "./5-expand-stroke";

/** An item inside a `<defs>` element, shown under it in the layers tree. Items are read-only and not on the canvas. */
export type DefsItem = {
    /** Stable within one defs element: `class:<name>` or `el:<index>` */
    key: string;
    /** `.name` for a class, the element id (or `<tag>`) for other elements */
    label: string;
    kind: 'class' | 'element';
    /** Element tag for `kind: 'element'`, e.g. `linearGradient` */
    tag?: string;
};

/**
 * Items of a `<defs>` element given its inner markup: one per class selector of its `<style>` children,
 * then one per other child element, in source order.
 */
export function defsItemsOf(inner: string): DefsItem[] {
    return defsItemsFromChildren(parseSvgFragment(inner) ?? []);
}

/** Same as `defsItemsOf`, for children that are already parsed */
export function defsItemsFromChildren(children: readonly SvgNode[]): DefsItem[] {
    const items: DefsItem[] = [];

    const classNames = new Set<string>();
    for (const rule of classRulesOf(children)) {
        for (const name of rule.classes) {
            classNames.add(name);
        }
    }
    for (const name of classNames) {
        items.push({ key: `class:${name}`, label: `.${name}`, kind: 'class' });
    }

    children.forEach((child, index) => {
        if (child.kind === 'passthrough' && child.tag.toLowerCase() === 'style') {
            return;
        }
        const tag = child.kind === 'passthrough' ? child.tag : child.kind;
        items.push({ key: `el:${index}`, label: child.attrs.id || `<${tag}>`, kind: 'element', tag });
    });

    return items;
}
