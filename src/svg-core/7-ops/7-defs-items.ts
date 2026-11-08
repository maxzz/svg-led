import { type SvgDoc } from "../1-model/1-types";
import { findNode, walkNodes } from "../1-model/3-tree";
import { parseDefsItemId, scanElements } from "../3-serialize/4-source-map";
import { CSS_OFF_CLOSE, CSS_OFF_OPEN, type CssDecl, classOfSelector, cssDeclsOf, cssRulesOf, isDeactivatedName, plainName, renameClassInSelectors, setTagDeactivatedInMarkup, splitDecl } from "../3-serialize/5-defs-markup";

/**
 * Items of a `<defs>` element, as the layers tree shows them. Deactivating renames or comments out; nothing is removed:
 * - an element (a `<style>` included) gets the prefix on its tag, such as `<deactivated-linearGradient>`;
 * - a class gets the prefix on its selector, such as `.deactivated-cls-1`; the declarations of a class are the rows of its table;
 * - a declaration is commented out, with the marker `svg-led:off` at the start of the comment.
 */

/** A declaration of a class: one row of the table under the class */
export type DefsDecl = {
    kind: 'decl';
    key: string;
    /** Position among the declarations of the class, over all its rules, in order */
    index: number;
    prop: string;
    value: string;
    /** True when the declaration is commented out */
    off: boolean;
    /** False when the text holds the comment end, so it cannot be commented out */
    toggleable: boolean;
};

/** A class of a `<style>` element of a `<defs>` element */
export type DefsClassItem = {
    kind: 'class';
    key: string;
    /** `<styleIndex>.<name>`: the class of one `<style>` element, so duplicate names in several styles stay apart */
    part: string;
    /** `.name` */
    label: string;
    name: string;
    /** Index of the `<style>` element among the children of its `<defs>` element */
    styleIndex: number;
    /** True when the class is deactivated (its selector carries the prefix) */
    off: boolean;
    decls: DefsDecl[];
};

/** An element inside a `<defs>` element, at any depth; a `<style>` element has its classes as children */
export type DefsElementItem = {
    kind: 'element';
    key: string;
    /** Position among the elements of the `<defs>` element, in document order */
    part: string;
    /** The element id, or `<tag>` when it has none */
    label: string;
    /** The tag without the prefix */
    tag: string;
    /** True when the tag carries the prefix */
    off: boolean;
    children: DefsItem[];
};

export type DefsItem = DefsClassItem | DefsElementItem;

//---------------------------------------------------------------------------
// Tree

/** Items of a `<defs>` element given its inner markup */
export function defsItemsOf(inner: string): DefsItem[] {
    return itemsOf(inner, treeOf(inner));
}

type Node = { index: number; start: number; end: number; tag: string; id: string | undefined; children: Node[]; };

/** Nests the elements of the markup by containment */
function treeOf(text: string): Node[] {
    const roots: Node[] = [];
    const stack: Node[] = [];
    scanElements(text).forEach((r, index) => {
        const node: Node = { index, start: r.start, end: r.end, ...describeMarkup(text.slice(r.start, r.end)), children: [] };
        while (stack.length && stack[stack.length - 1].end <= node.start) {
            stack.pop();
        }
        (stack.length ? stack[stack.length - 1].children : roots).push(node);
        stack.push(node);
    });
    return roots;
}

/** Tag and id of an element, read from its start tag only */
function describeMarkup(markup: string): { tag: string; id: string | undefined; } {
    const gt = markup.indexOf('>');
    const startTag = gt === -1 ? markup : markup.slice(0, gt);
    return {
        tag: /^<([^\s/>]+)/.exec(startTag)?.[1] ?? '',
        id: /\sid\s*=\s*(["'])(.*?)\1/.exec(startTag)?.[2] || undefined,
    };
}

function itemsOf(text: string, nodes: Node[]): DefsItem[] {
    return nodes.map((n): DefsElementItem => {
        const tag = plainName(n.tag);
        const isStyle = tag.toLowerCase() === 'style';
        return {
            kind: 'element',
            key: `el:${n.index}`,
            part: String(n.index),
            label: n.id ?? `<${tag}>`,
            tag,
            off: isDeactivatedName(n.tag),
            children: isStyle ? classItemsOf(styleCssOf(text.slice(n.start, n.end)), n.index) : itemsOf(text, n.children),
        };
    });
}

/** Classes of one stylesheet, in order of their first rule */
function classItemsOf(css: string, styleIndex: number): DefsClassItem[] {
    const rules = cssRulesOf(css);
    const names: string[] = [];
    for (const rule of rules) {
        for (const sel of rule.selectors) {
            const cls = classOfSelector(sel);
            cls && !names.includes(cls.name) && names.push(cls.name);
        }
    }
    return names.map((name): DefsClassItem => {
        const active = rules.some((rule) => rule.selectors.some((sel) => {
            const cls = classOfSelector(sel);
            return cls?.name === name && !cls.deactivated;
        }));
        const part = `${styleIndex}.${name}`;
        return {
            kind: 'class',
            key: `class:${part}`,
            part,
            label: `.${name}`,
            name,
            styleIndex,
            off: !active,
            decls: declsOfClassIn(css, name).map((d, index): DefsDecl => {
                const { prop, value } = splitDecl(d.text);
                return { kind: 'decl', key: `decl:${index}`, index, prop, value, off: d.off, toggleable: d.off || !d.text.includes(CSS_OFF_CLOSE) };
            }),
        };
    });
}

/** Declarations of the class `name` in a stylesheet, over all its rules, in order */
function declsOfClassIn(css: string, name: string): CssDecl[] {
    return cssRulesOf(css)
        .filter((rule) => rule.selectors.some((sel) => classOfSelector(sel)?.name === name))
        .flatMap((rule) => cssDeclsOf(css, rule));
}

/** Text between the start and end tags of a `<style>` element */
function styleCssOf(markup: string): string {
    const open = markup.indexOf('>') + 1;
    const close = markup.lastIndexOf('</');
    return open > 0 && close >= open ? markup.slice(open, close) : '';
}

/**
 * The `<style>` element at `index` among the elements of `inner`: its text, and where the text sits in `inner`.
 * `ranges` is `scanElements(inner)`, passed in when the caller has it already.
 */
function styleAt(inner: string, index: number, ranges = scanElements(inner)): { open: number; close: number; css: string; } | undefined {
    const r = ranges[index];
    if (!r) {
        return undefined;
    }
    const markup = inner.slice(r.start, r.end);
    if (plainName(describeMarkup(markup).tag).toLowerCase() !== 'style') {
        return undefined;
    }
    const open = r.start + markup.indexOf('>') + 1;
    const close = r.start + markup.lastIndexOf('</');
    return open > r.start && close >= open ? { open, close, css: inner.slice(open, close) } : undefined;
}

//---------------------------------------------------------------------------
// Changes (return the new inner markup; the same text when nothing changes)

/** Renames the element at `index` to deactivated (`active` false) or back (`active` true) */
export function setDefsElementActiveInMarkup(inner: string, index: number, active: boolean): string {
    const r = scanElements(inner)[index];
    if (!r) {
        return inner;
    }
    const markup = inner.slice(r.start, r.end);
    const next = setTagDeactivatedInMarkup(markup, !active);
    return next === markup ? inner : inner.slice(0, r.start) + next + inner.slice(r.end);
}

/**
 * Deactivates (`active` false) or activates (`active` true) every direct child of a `<defs>` element, each on its own:
 * an element is renamed, so a `<style>` child becomes `<deactivated-style>`. Renaming the `<defs>` tag itself has no effect,
 * because the elements inside still resolve their references (`url(#id)`), so the children must be renamed.
 */
export function setDefsChildrenActiveInMarkup(inner: string, active: boolean): string {
    let out = inner;
    // from the last child to the first, so the offsets of the earlier children stay valid
    for (const child of treeOf(inner).reverse()) {
        const markup = out.slice(child.start, child.end);
        const next = setTagDeactivatedInMarkup(markup, !active);
        out = out.slice(0, child.start) + next + out.slice(child.end);
    }
    return out;
}

/** Renames the class `name` of the `<style>` element `styleIndex` to deactivated (`active` false) or back; the other styles are not touched */
export function setDefsClassActiveInMarkup(inner: string, styleIndex: number, name: string, active: boolean): string {
    const st = styleAt(inner, styleIndex);
    if (!st) {
        return inner;
    }
    let css = st.css;
    const rules = cssRulesOf(css);
    // from the last rule to the first, so the offsets of the earlier rules stay valid
    for (let k = rules.length - 1; k >= 0; k--) {
        const rule = rules[k];
        if (rule.selectors.some((sel) => classOfSelector(sel)?.name === name)) {
            const head = css.slice(rule.start, rule.headEnd);
            css = css.slice(0, rule.start) + renameClassInSelectors(head, name, !active) + css.slice(rule.headEnd);
        }
    }
    return css === st.css ? inner : inner.slice(0, st.open) + css + inner.slice(st.close);
}

/**
 * Comments out (`active` false) or restores (`active` true) declaration `declIndex` of the class `name`
 * of the `<style>` element `styleIndex`. A declaration whose text holds the comment end is left alone.
 */
export function setDefsDeclActiveInMarkup(inner: string, styleIndex: number, name: string, declIndex: number, active: boolean): string {
    const st = styleAt(inner, styleIndex);
    const decl = st && declsOfClassIn(st.css, name)[declIndex];
    if (!st || !decl || decl.off !== active) {
        return inner; // unknown declaration, or already in the state asked for
    }
    if (!active && decl.text.includes(CSS_OFF_CLOSE)) {
        return inner;
    }
    const text = active ? decl.text : `${CSS_OFF_OPEN}${decl.text}${CSS_OFF_CLOSE}`;
    const css = st.css.slice(0, decl.start) + text + st.css.slice(decl.end);
    return inner.slice(0, st.open) + css + inner.slice(st.close);
}

//---------------------------------------------------------------------------
// Queries

/** Class names of the `<style>` elements of the markup, deactivated classes included, by their plain names */
function classNamesOf(inner: string): Set<string> {
    const rv = new Set<string>();
    const ranges = scanElements(inner);
    ranges.forEach((_, index) => {
        const st = styleAt(inner, index, ranges);
        st && cssRulesOf(st.css).forEach((rule) => rule.selectors.forEach((sel) => {
            const cls = classOfSelector(sel);
            cls && rv.add(cls.name);
        }));
    });
    return rv;
}

/** Ids of the `<defs>` elements that define a class used by one of the given nodes. Deactivated classes and `<defs>` elements count too. */
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
        if (node.kind === 'passthrough' && plainName(node.tag).toLowerCase() === 'defs' && [...classNamesOf(node.inner)].some((name) => used.has(name))) {
            rv.push(node.id);
        }
    });
    return rv;
}

/** True when `id` names an element or a class of a `<defs>` element of `doc` that still exists */
export function isDefsItemOf(doc: SvgDoc, id: string): boolean {
    const parsed = parseDefsItemId(id);
    const node = parsed ? findNode(doc, parsed.defsId)?.node : undefined;
    if (!parsed || node?.kind !== 'passthrough') {
        return false;
    }
    const { part } = parsed;
    const inner = node.inner;
    const cls = /^(\d+)\.(.+)$/.exec(part);
    if (cls) {
        const st = styleAt(inner, Number(cls[1]));
        return !!st && classItemsOf(st.css, Number(cls[1])).some((c) => c.name === cls[2]);
    }
    return /^\d+$/.test(part) && Number(part) < scanElements(inner).length;
}
