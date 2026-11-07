import { type SvgDoc, type SvgNode } from "../1-model/1-types";
import { findNode, walkNodes } from "../1-model/3-tree";
import { parseSvgFragment } from "../2-parse/1-parse-svg";
import { classRulesOf } from "./5-expand-stroke";

/**
 * A class is turned off by renaming its selector: `.name` becomes `.deactivated-name`,
 * so no element can match it and the elements that use it disappear. Turning it on removes the prefix.
 */
export const DEACTIVATED_PREFIX = 'deactivated-';

/** An item inside a `<defs>` element, shown under it in the layers tree. Items are not on the canvas. */
export type DefsItem = {
    /** Stable within one defs element: `class:<name>` or `el:<index>` */
    key: string;
    /** `.name` for a class, the element id (or `<tag>`) for other elements */
    label: string;
    kind: 'class' | 'element';
    /** Element tag for `kind: 'element'`, e.g. `linearGradient` */
    tag?: string;
    /** Class name without the deactivated prefix, for `kind: 'class'` */
    name?: string;
    /** For a class: false when its rules are renamed to `.deactivated-<name>` */
    active?: boolean;
};

/**
 * Items of a `<defs>` element given its inner markup: one per class of its `<style>` children,
 * then one per other child element, in source order.
 */
export function defsItemsOf(inner: string): DefsItem[] {
    return defsItemsFromChildren(parseSvgFragment(inner) ?? []);
}

/** Same as `defsItemsOf`, for children that are already parsed */
export function defsItemsFromChildren(children: readonly SvgNode[]): DefsItem[] {
    const items: DefsItem[] = [];

    const active = new Set<string>();
    const inactive = new Set<string>();
    for (const rule of classRulesOf(children)) {
        for (const cls of rule.classes) {
            if (cls.length > DEACTIVATED_PREFIX.length && cls.startsWith(DEACTIVATED_PREFIX)) {
                inactive.add(cls.slice(DEACTIVATED_PREFIX.length));
            } else {
                active.add(cls);
            }
        }
    }
    for (const name of new Set([...active, ...inactive])) {
        items.push({ key: `class:${name}`, label: `.${name}`, kind: 'class', name, active: active.has(name) });
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

/**
 * Inner markup of a `<defs>` element with one class turned on or off: its selector in every `<style>` is renamed.
 * Class names come from `classRulesOf`, so they hold only letters, digits, `_` and `-`; no escaping is needed.
 */
export function setDefsClassActiveInMarkup(inner: string, name: string, active: boolean): string {
    const from = active ? DEACTIVATED_PREFIX + name : name;
    const to = active ? name : DEACTIVATED_PREFIX + name;
    const selector = new RegExp(`(^|[^\\w-])\\.${from}(?![\\w-])`, 'g');

    return inner.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open: string, css: string, close: string) => (
        open + css.replace(/[^{}]+(?=\{)/g, (sel) => sel.replace(selector, `$1.${to}`)) + close
    ));
}

/**
 * Ids of the `<defs>` elements that define a class used by one of the given nodes.
 * Classes that are turned off count too, because they are still the classes of those nodes.
 */
export function defsIdsForClassesOf(doc: SvgDoc, ids: readonly string[]): string[] {
    const used = new Set<string>();
    for (const id of ids) {
        for (const cls of findNode(doc, id)?.node.attrs.class?.trim().split(/\s+/) ?? []) {
            cls && used.add(cls);
        }
    }
    if (!used.size) {
        return [];
    }

    const rv: string[] = [];
    walkNodes(doc.children, (node) => {
        if (node.kind === 'passthrough' && node.tag.toLowerCase() === 'defs' && [...classNamesOfDefs(node.inner)].some((name) => used.has(name))) {
            rv.push(node.id);
        }
    });
    return rv;
}

/** Base class names defined by the `<style>` elements of a defs element; reads the markup without parsing it */
function classNamesOfDefs(inner: string): Set<string> {
    const rv = new Set<string>();
    for (const rule of classRulesOf([{ id: '', kind: 'passthrough', tag: 'defs', inner, attrs: {} }])) {
        for (const cls of rule.classes) {
            rv.add(cls.length > DEACTIVATED_PREFIX.length && cls.startsWith(DEACTIVATED_PREFIX) ? cls.slice(DEACTIVATED_PREFIX.length) : cls);
        }
    }
    return rv;
}
