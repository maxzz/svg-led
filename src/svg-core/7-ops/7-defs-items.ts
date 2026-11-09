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
    /** True for a direct child of the `<defs>` element (only those can be dragged between `<defs>` elements) */
    topLevel: boolean;
    /** Position among the direct children of the `<defs>` element of the top-level element this item belongs to */
    root: number;
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

function itemsOf(text: string, nodes: Node[], root?: number): DefsItem[] {
    return nodes.map((n, i): DefsElementItem => {
        const tag = plainName(n.tag);
        const isStyle = tag.toLowerCase() === 'style';
        const ordinal = root ?? i;
        return {
            kind: 'element',
            key: `el:${n.index}`,
            part: String(n.index),
            label: n.id ?? `<${tag}>`,
            tag,
            off: isDeactivatedName(n.tag),
            topLevel: root === undefined,
            root: ordinal,
            children: isStyle ? classItemsOf(styleCssOf(text.slice(n.start, n.end)), n.index) : itemsOf(text, n.children, ordinal),
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
export function styleAt(inner: string, index: number, ranges = scanElements(inner)): { open: number; close: number; css: string; } | undefined {
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

//---------------------------------------------------------------------------
// Moves (drag and drop in the layers tree). Each returns the new markup of the source and of the destination `<defs>`
// element. When the destination is the source (`dst` undefined), both results are the same text.
// undefined means nothing would change, or the item or target does not exist.

/** Where a dragged top-level element of a `<defs>` element goes: above or below the top-level element `ordinal`, or at the end */
export type DefsElementDrop = { ordinal: number; place: 'above' | 'below'; } | { place: 'end'; };

/** Where a dragged class goes: above or below class `name` of the `<style>` element `styleIndex`, or at the end of that style */
export type DefsClassDrop = { styleIndex: number; place: 'above' | 'below'; name: string; } | { styleIndex: number; place: 'end'; };

/** Moves the top-level element `ordinal` of `src` to `drop` in `dst` (a `<defs>` element; undefined means `src` itself) */
export function moveDefsElementMarkup(src: string, ordinal: number, dst: string | undefined, drop: DefsElementDrop): { src: string; dst: string; } | undefined {
    const roots = treeOf(src);
    const moved = roots[ordinal];
    if (!moved) {
        return undefined;
    }
    if (dst === undefined && drop.place !== 'end') {
        // dropping the element next to itself leaves the order as it was
        const next = ordinal + 1;
        const prev = ordinal - 1;
        if (drop.ordinal === ordinal || (drop.place === 'above' && drop.ordinal === next) || (drop.place === 'below' && drop.ordinal === prev)) {
            return undefined;
        }
    }
    const markup = src.slice(moved.start, moved.end);
    const rest = src.slice(0, moved.start) + src.slice(moved.end);
    if (dst === undefined) {
        const target: DefsElementDrop = drop.place === 'end' ? drop : { place: drop.place, ordinal: drop.ordinal > ordinal ? drop.ordinal - 1 : drop.ordinal };
        const out = insertRootMarkup(rest, markup, target);
        return out === undefined ? undefined : { src: out, dst: out };
    }
    const out = insertRootMarkup(dst, markup, drop);
    return out === undefined ? undefined : { src: rest, dst: out };
}

/** Inserts element markup among the top-level elements of `inner` */
function insertRootMarkup(inner: string, markup: string, drop: DefsElementDrop): string | undefined {
    if (drop.place === 'end') {
        const at = treeOf(inner).at(-1)?.end ?? inner.length;
        return inner.slice(0, at) + markup + inner.slice(at);
    }
    const target = treeOf(inner)[drop.ordinal];
    if (!target) {
        return undefined;
    }
    const at = drop.place === 'above' ? target.start : target.end;
    return inner.slice(0, at) + markup + inner.slice(at);
}

/**
 * Moves the class `from.name` of the `<style>` element `from.styleIndex` of `src` to `drop` in `dst`
 * (a `<defs>` element; undefined means `src` itself). The rules of the class move with it; a rule shared with other
 * classes keeps the others, and the moved class gets a rule of its own with the same declarations.
 */
export function moveDefsClassMarkup(src: string, from: { styleIndex: number; name: string; }, dst: string | undefined, drop: DefsClassDrop): { src: string; dst: string; } | undefined {
    const st = styleAt(src, from.styleIndex);
    const taken = st && takeClassRules(st.css, from.name);
    if (!st || !taken) {
        return undefined;
    }
    const srcOut = src.slice(0, st.open) + taken.css + src.slice(st.close);
    if (dst === undefined) {
        if (drop.styleIndex === from.styleIndex && drop.place !== 'end') {
            // dropping the class next to itself leaves the order as it was
            const names = classItemsOf(st.css, from.styleIndex).map((c) => c.name);
            const at = names.indexOf(from.name);
            const to = names.indexOf(drop.name);
            if (drop.name === from.name || (drop.place === 'above' && to === at + 1) || (drop.place === 'below' && to === at - 1)) {
                return undefined;
            }
        }
        const out = insertClassRules(srcOut, drop, taken.pieces);
        return out === undefined ? undefined : { src: out, dst: out };
    }
    const out = insertClassRules(dst, drop, taken.pieces);
    return out === undefined ? undefined : { src: srcOut, dst: out };
}

/** Removes the rules of class `name` from a stylesheet. Returns the rest of the sheet and the rules taken out, in order. */
export function takeClassRules(css: string, name: string): { css: string; pieces: string[]; } | undefined {
    const rules = cssRulesOf(css);
    const pieces: string[] = [];
    let out = css;
    // from the last rule to the first, so the offsets of the earlier rules stay valid
    for (let k = rules.length - 1; k >= 0; k--) {
        const rule = rules[k];
        const mine = rule.selectors.filter((sel) => classOfSelector(sel)?.name === name);
        if (!mine.length) {
            continue;
        }
        const rest = rule.selectors.filter((sel) => !mine.includes(sel));
        pieces.unshift(`${mine.join(', ')}{${rule.body}}`);
        if (rest.length) {
            out = out.slice(0, rule.start) + `${rest.join(', ')}{${rule.body}}` + out.slice(rule.end);
        } else {
            // a removed rule takes the white space in front of it, so no blank line is left behind
            const gap = /\s*$/.exec(out.slice(0, rule.start))?.[0].length ?? 0;
            out = out.slice(0, rule.start - gap) + out.slice(rule.end);
        }
    }
    return pieces.length ? { css: out, pieces } : undefined;
}

/** Puts the class rules `pieces` into the `<style>` element of `inner` named by `drop` */
function insertClassRules(inner: string, drop: DefsClassDrop, pieces: string[]): string | undefined {
    const st = styleAt(inner, drop.styleIndex);
    if (!st) {
        return undefined;
    }
    const css = st.css;
    let next: string;
    if (drop.place === 'end') {
        // before a CDATA end marker, if there is one
        let tail = css.trimEnd().length;
        if (css.slice(0, tail).endsWith(']]>')) {
            tail -= 3;
        }
        next = css.slice(0, tail) + '\n' + pieces.join('\n') + css.slice(tail);
    } else {
        const target = cssRulesOf(css).find((rule) => rule.selectors.some((sel) => classOfSelector(sel)?.name === drop.name));
        if (!target) {
            return undefined;
        }
        const indent = /[ \t]*$/.exec(css.slice(0, target.start))?.[0] ?? '';
        next = drop.place === 'above'
            ? css.slice(0, target.start) + pieces.join(`\n${indent}`) + `\n${indent}` + css.slice(target.start)
            : css.slice(0, target.end) + `\n${indent}` + pieces.join(`\n${indent}`) + css.slice(target.end);
    }
    return inner.slice(0, st.open) + next + inner.slice(st.close);
}
