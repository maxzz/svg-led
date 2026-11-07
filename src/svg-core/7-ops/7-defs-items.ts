import { type SvgDoc, type SvgNode } from "../1-model/1-types";
import { findNode, walkNodes } from "../1-model/3-tree";
import { parseDefsElementId, scanElements } from "../3-serialize/4-source-map";
import { classRulesOf } from "./5-expand-stroke";

/**
 * A class is turned off by renaming its selector: `.name` becomes `.deactivated-name`,
 * so no element can match it and the elements that use it disappear. Turning it on removes the prefix.
 */
export const DEACTIVATED_PREFIX = 'deactivated-';

/** A class of a `<defs>` element, shown under it in the layers tree */
export type DefsClassItem = {
    kind: 'class';
    /** `class:<name>` */
    key: string;
    /** `.name` */
    label: string;
    name: string;
    /** False when the rule is renamed to `.deactivated-<name>` */
    active: boolean;
};

/** An element inside a `<defs>` element (at any depth), shown as a selectable row */
export type DefsElementItem = {
    kind: 'element';
    /** `el:<index>`, unique within the defs element */
    key: string;
    /** Pre-order index among all elements of the defs element; see `defsElementId` */
    index: number;
    /** The element id, or `<tag>` when it has none */
    label: string;
    tag: string;
    /** Elements nested directly inside this one (style elements are not listed) */
    children: DefsElementItem[];
};

export type DefsItem = DefsClassItem | DefsElementItem;

/**
 * Items of a `<defs>` element given its inner markup: its classes first (one per class of its `<style>` children),
 * then its elements as a tree. Works on the markup text, so it does not need the DOM.
 */
export function defsItemsOf(inner: string): DefsItem[] {
    return [...classItemsOf(inner), ...elementItemsOf(inner)];
}

/** True when `id` names an element inside a `<defs>` element of `doc` that still exists */
export function isDefsElementOf(doc: SvgDoc, id: string): boolean {
    const parsed = parseDefsElementId(id);
    const node = parsed ? findNode(doc, parsed.defsId)?.node : undefined;
    return !!parsed && node?.kind === 'passthrough' && parsed.index < scanElements(node.inner).length;
}

//---------------------------------------------------------------------------

function classItemsOf(inner: string): DefsClassItem[] {
    const wrapper: SvgNode = { id: '', kind: 'passthrough', tag: 'defs', inner, attrs: {} };
    const active = new Set<string>();
    const inactive = new Set<string>();
    for (const rule of classRulesOf([wrapper])) {
        for (const cls of rule.classes) {
            if (cls.length > DEACTIVATED_PREFIX.length && cls.startsWith(DEACTIVATED_PREFIX)) {
                inactive.add(cls.slice(DEACTIVATED_PREFIX.length));
            } else {
                active.add(cls);
            }
        }
    }
    return [...new Set([...active, ...inactive])].map((name): DefsClassItem => ({
        kind: 'class',
        key: `class:${name}`,
        label: `.${name}`,
        name,
        active: active.has(name),
    }));
}

type ScannedElement = { tag: string; id: string | undefined; parent: number; };

/** Tag, id and parent (index in the list, -1 for none) of every element of the markup, in document order */
function scanInner(inner: string): ScannedElement[] {
    const ranges = scanElements(inner);
    return ranges.map((r, i) => {
        const startTag = inner.slice(r.start, r.end);
        const tag = /^<([^\s/>]+)/.exec(startTag)?.[1] ?? '';
        const id = /\sid\s*=\s*(["'])(.*?)\1/.exec(startTag)?.[2];
        // the nearest earlier element that still contains this one
        let parent = -1;
        for (let j = i - 1; j >= 0; j--) {
            if (ranges[j].end > r.start) {
                parent = j;
                break;
            }
        }
        return { tag, id: id || undefined, parent };
    });
}

function elementItemsOf(inner: string): DefsElementItem[] {
    const scanned = scanInner(inner);
    const items: DefsElementItem[] = scanned.map((e, index) => ({
        kind: 'element',
        key: `el:${index}`,
        index,
        label: e.id ?? `<${e.tag}>`,
        tag: e.tag,
        children: [],
    }));

    const roots: DefsElementItem[] = [];
    scanned.forEach((e, i) => {
        if (e.tag.toLowerCase() === 'style') {
            return;
        }
        if (e.parent >= 0) {
            items[e.parent].children.push(items[i]);
        } else {
            roots.push(items[i]);
        }
    });
    return roots;
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
        if (node.kind === 'passthrough' && node.tag.toLowerCase() === 'defs'
            && classItemsOf(node.inner).some((item) => used.has(item.name))) {
            rv.push(node.id);
        }
    });
    return rv;
}
