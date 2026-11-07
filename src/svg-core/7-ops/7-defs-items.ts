import { type SvgDoc } from "../1-model/1-types";
import { findNode, walkNodes } from "../1-model/3-tree";
import { parseDefsItemId, scanElements } from "../3-serialize/4-source-map";
import { CSS_OFF_CLOSE, CSS_OFF_OPEN, OFF_CLOSE, OFF_OPEN, cssOriginalBody, cssRulesOf, offBlocksOf } from "../3-serialize/5-defs-markup";

/**
 * Items of a `<defs>` element, as the layers tree shows them.
 * - An element is deactivated by wrapping its markup in a comment (`OFF_OPEN`). Its contents are then listed under it, marked off.
 * - A class is deactivated by rewriting its rule to `display:none`, keeping the declarations in a comment (`CSS_OFF_OPEN`).
 * - A `<style>` element is an item of its own, with its classes as children.
 */

/** A class of a `<style>` element of a `<defs>` element */
export type DefsClassItem = {
    kind: 'class';
    /** `class:<name>` */
    key: string;
    /** `.name` */
    label: string;
    name: string;
    /** False when the rule is deactivated */
    active: boolean;
    /** False when the original declarations contain the comment end, so they cannot be kept in a comment */
    toggleable: boolean;
};

/** An element inside a `<defs>` element, at any depth */
export type DefsElementItem = {
    kind: 'element';
    /** `el:<part>` */
    key: string;
    /** The id part: a live element index, `o<n>` for a deactivated element, or `o<n>.<k>` for an element inside one */
    part: string;
    /** The element id, or `<tag>` when it has none */
    label: string;
    tag: string;
    /** Inside a deactivated element: its own block, or nested in it */
    off: boolean;
    /** False for elements inside a deactivated element (their block is turned on instead), style elements and elements that cannot be commented out */
    toggleable: boolean;
    children: DefsItem[];
};

export type DefsItem = DefsClassItem | DefsElementItem;

//---------------------------------------------------------------------------
// Tree

/** Items of a `<defs>` element given its inner markup */
export function defsItemsOf(inner: string): DefsItem[] {
    return itemsOf(inner, treeOf(entriesOf(inner)));
}

type Entry = { start: number; end: number; tag: string; id: string | undefined; part: string; off: boolean; };

/** Live elements and deactivated elements of the markup, in document order */
function entriesOf(inner: string): Entry[] {
    const out: Entry[] = [];
    scanElements(inner).forEach((r, n) => {
        out.push({ ...describeMarkup(inner.slice(r.start, r.end)), start: r.start, end: r.end, part: String(n), off: false });
    });
    offBlocksOf(inner).forEach((b, n) => {
        const content = inner.slice(b.contentStart, b.contentEnd);
        scanElements(content).forEach((r, k) => {
            const markup = content.slice(r.start, r.end);
            out.push(k === 0
                ? { ...describeMarkup(markup), start: b.start, end: b.end, part: `o${n}`, off: true }
                : { ...describeMarkup(markup), start: b.contentStart + r.start, end: b.contentStart + r.end, part: `o${n}.${k}`, off: true });
        });
    });
    return out.sort((a, b) => a.start - b.start);
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

type Node = Entry & { children: Node[]; };

/** Nests the entries by containment; the entries must be in document order */
function treeOf(entries: Entry[]): Node[] {
    const roots: Node[] = [];
    const stack: Node[] = [];
    for (const e of entries) {
        const node: Node = { ...e, children: [] };
        while (stack.length && stack[stack.length - 1].end <= node.start) {
            stack.pop();
        }
        (stack.length ? stack[stack.length - 1].children : roots).push(node);
        stack.push(node);
    }
    return roots;
}

function itemsOf(inner: string, nodes: Node[]): DefsItem[] {
    return nodes.map((n): DefsElementItem => {
        const markup = inner.slice(n.start, n.end);
        const isStyle = !n.off && n.tag.toLowerCase() === 'style';
        const canComment = n.off ? /^o\d+$/.test(n.part) : !markup.includes('--');
        return {
            kind: 'element',
            key: `el:${n.part}`,
            part: n.part,
            label: n.id ?? `<${n.tag}>`,
            tag: n.tag,
            off: n.off,
            toggleable: canComment && !isStyle,
            children: isStyle ? classItemsOfCss(styleCssOf(markup)) : itemsOf(inner, n.children),
        };
    });
}

/** Classes of one stylesheet. A class with an active rule is active, even if another of its rules is deactivated. */
function classItemsOfCss(css: string): DefsClassItem[] {
    const byName = new Map<string, DefsClassItem>();
    for (const rule of cssRulesOf(css)) {
        const off = cssOriginalBody(rule.body) !== undefined;
        for (const sel of rule.selectors) {
            const name = CLASS_SELECTOR.exec(sel)?.[1];
            if (!name) {
                continue;
            }
            const prev = byName.get(name);
            if (!prev) {
                byName.set(name, { kind: 'class', key: `class:${name}`, label: `.${name}`, name, active: !off, toggleable: off || !rule.body.includes(CSS_OFF_CLOSE) });
            } else if (!off && !prev.active) {
                prev.active = true;
                prev.toggleable = !rule.body.includes(CSS_OFF_CLOSE);
            }
        }
    }
    return [...byName.values()];
}

const CLASS_SELECTOR = /^\.([A-Za-z_][\w-]*)$/;

/** Text between the start and end tags of a `<style>` element */
function styleCssOf(markup: string): string {
    const open = markup.indexOf('>') + 1;
    const close = markup.lastIndexOf('</');
    return open > 0 && close >= open ? markup.slice(open, close) : '';
}

/** Offsets of the text of each live `<style>` element of the markup */
function styleCssRanges(inner: string): { open: number; close: number; }[] {
    const rv: { open: number; close: number; }[] = [];
    for (const r of scanElements(inner)) {
        const markup = inner.slice(r.start, r.end);
        if (!/^<style[\s>]/i.test(markup)) {
            continue;
        }
        const open = markup.indexOf('>') + 1;
        const close = markup.lastIndexOf('</');
        if (open > 0 && close >= open) {
            rv.push({ open: r.start + open, close: r.start + close });
        }
    }
    return rv;
}

/** Names of all classes that have a rule in the live `<style>` elements of the markup */
function classNamesOf(inner: string): Set<string> {
    const rv = new Set<string>();
    for (const { open, close } of styleCssRanges(inner)) {
        for (const rule of cssRulesOf(inner.slice(open, close))) {
            for (const sel of rule.selectors) {
                const name = CLASS_SELECTOR.exec(sel)?.[1];
                name && rv.add(name);
            }
        }
    }
    return rv;
}

//---------------------------------------------------------------------------
// Changes (return the new inner markup; the same text when nothing changes)

/**
 * Turns a class on or off by rewriting its rule.
 * Off: `.name{display:none;/*svg-led:off <declarations> *\/}` (the rule keeps its other selectors in a rule of their own).
 * On: the rule is restored from the declarations kept in the comment.
 */
export function setDefsClassActiveInMarkup(inner: string, name: string, on: boolean): string {
    const selector = `.${name}`;
    for (const { open, close } of styleCssRanges(inner)) {
        const css = inner.slice(open, close);
        for (const rule of cssRulesOf(css)) {
            if (!rule.selectors.includes(selector)) {
                continue;
            }
            const original = cssOriginalBody(rule.body);
            if (on ? original === undefined : original !== undefined) {
                continue;
            }
            let replacement: string;
            if (on) {
                replacement = `${selector}{${original}}`;
            } else {
                if (rule.body.includes(CSS_OFF_CLOSE)) {
                    return inner;
                }
                const others = rule.selectors.filter((s) => s !== selector);
                replacement = (others.length ? `${others.join(', ')}{${rule.body}}` : '')
                    + `${selector}{display:none;${CSS_OFF_OPEN}${rule.body}${CSS_OFF_CLOSE}}`;
            }
            return inner.slice(0, open) + css.slice(0, rule.start) + replacement + css.slice(rule.end) + inner.slice(close);
        }
    }
    return inner;
}

/**
 * Turns an element on or off.
 * Off (`on` false): the element's markup is wrapped in a comment. Elements whose markup holds `--`, and `<style>` elements, are left alone.
 * On: the comment of a deactivated element is removed; `part` must name the block (`o<n>`).
 */
export function setDefsElementActiveInMarkup(inner: string, part: string, on: boolean): string {
    if (/^\d+$/.test(part)) {
        if (on) {
            return inner;
        }
        const r = scanElements(inner)[Number(part)];
        if (!r) {
            return inner;
        }
        const markup = inner.slice(r.start, r.end);
        if (markup.includes('--') || /^<style[\s>]/i.test(markup)) {
            return inner;
        }
        return inner.slice(0, r.start) + OFF_OPEN + markup + OFF_CLOSE + inner.slice(r.end);
    }
    const block = /^o(\d+)$/.exec(part);
    const b = block && on ? offBlocksOf(inner)[Number(block[1])] : undefined;
    return b ? inner.slice(0, b.start) + inner.slice(b.contentStart, b.contentEnd) + inner.slice(b.end) : inner;
}

//---------------------------------------------------------------------------
// Queries

/** Ids of the `<defs>` elements that define a class used by one of the given nodes. Deactivated classes count too. */
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
        if (node.kind === 'passthrough' && node.tag.toLowerCase() === 'defs' && [...classNamesOf(node.inner)].some((name) => used.has(name))) {
            rv.push(node.id);
        }
    });
    return rv;
}

/** True when `id` names a class, an element, or an element inside a deactivated element, of a `<defs>` element of `doc` that still exists */
export function isDefsItemOf(doc: SvgDoc, id: string): boolean {
    const parsed = parseDefsItemId(id);
    const node = parsed ? findNode(doc, parsed.defsId)?.node : undefined;
    if (!parsed || node?.kind !== 'passthrough') {
        return false;
    }
    const { part } = parsed;
    const inner = node.inner;
    if (part.startsWith('.')) {
        return classNamesOf(inner).has(part.slice(1));
    }
    const block = /^o(\d+)(?:\.(\d+))?$/.exec(part);
    if (block) {
        const b = offBlocksOf(inner)[Number(block[1])];
        if (!b) {
            return false;
        }
        return block[2] === undefined || Number(block[2]) < scanElements(inner.slice(b.contentStart, b.contentEnd)).length;
    }
    return /^\d+$/.test(part) && Number(part) < scanElements(inner).length;
}
