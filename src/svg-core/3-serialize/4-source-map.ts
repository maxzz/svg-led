import { type SvgDoc, type SvgNode } from "../1-model/1-types";
import { cssRulesOf, offBlocksOf } from "./5-defs-markup";

/** Position of one element in the source text; lines are 1-based like in Monaco */
export type SourceRange = {
    start: number;               // offset of '<'
    end: number;                 // offset after the closing '>'
    startLine: number;
    endLine: number;
};

export type SourceMap = Map<string, SourceRange>;

/** Separates the id of a `<defs>` element from the part that names an item inside it: `<defsId>/<part>` */
export const DEFS_ITEM_SEP = '/';

/** Id of an item inside a `<defs>` element; `part` names it: a live element index, `o<n>[.<k>]`, or `.<class>` */
export function defsItemId(defsId: string, part: string): string {
    return `${defsId}${DEFS_ITEM_SEP}${part}`;
}

/** Id of the live element at pre-order `index` inside a `<defs>` element (index 0 is its first descendant) */
export function defsElementId(defsId: string, index: number): string {
    return defsItemId(defsId, String(index));
}

/** Id of a class of a `<defs>` element; the part is the selector, `.<name>` */
export function defsClassId(defsId: string, name: string): string {
    return defsItemId(defsId, `.${name}`);
}

/** Splits an id made by `defsElementId` or `defsClassId`; undefined for ordinary node ids */
export function parseDefsItemId(id: string): { defsId: string; part: string; } | undefined {
    const i = id.indexOf(DEFS_ITEM_SEP);
    return i <= 0 ? undefined : { defsId: id.slice(0, i), part: id.slice(i + 1) };
}

//---------------------------------------------------------------------------
/**
 * Maps node ids to their element ranges in `text`.
 * Works for any text that parses to `doc`: elements are matched by their order of appearance,
 * which is the same for DOMParser and for this scanner.
 * The elements inside a `<defs>` element (not nodes of the document) get ids from `defsElementId`.
 */
export function buildSourceMap(text: string, doc: SvgDoc): SourceMap {
    const ranges = scanElements(text);
    const lineStarts = computeLineStarts(text);
    const rv: SourceMap = new Map();
    const rangeOf = (r: ElementRange): SourceRange => ({
        start: r.start,
        end: r.end,
        startLine: lineOf(lineStarts, r.start),
        endLine: lineOf(lineStarts, Math.max(r.start, r.end - 1)),
    });

    let index = 1; // 0 is the root <svg>
    const visit = (nodes: readonly SvgNode[]) => {
        for (const node of nodes) {
            const r = ranges[index];
            if (r) {
                rv.set(node.id, rangeOf(r));
            }
            index++;
            if (node.kind === 'g') {
                visit(node.children);
            } else if (node.kind === 'passthrough' && node.inner) {
                const inner = scanElements(node.inner);
                inner.forEach((_, k) => {
                    const d = ranges[index + k];
                    d && rv.set(defsElementId(node.id, k), rangeOf(d));
                });
                for (const [name, r] of classRuleRanges(text, ranges.slice(index, index + inner.length))) {
                    rv.set(defsClassId(node.id, name), rangeOf(r));
                }
                // deactivated elements: a comment in the text, with the element itself first and its contents after it
                const defsEl = ranges[index - 1];
                defsEl && offBlockRanges(text, defsEl).forEach(({ n, k, r }) => {
                    rv.set(defsItemId(node.id, k === 0 ? `o${n}` : `o${n}.${k}`), rangeOf(r));
                });
                index += inner.length;
            }
        }
    };
    visit(doc.children);
    return rv;
}

/** Innermost node whose element contains the offset */
export function nodeAtOffset(map: SourceMap, offset: number): string | undefined {
    let best: string | undefined;
    let bestLen = Infinity;
    for (const [id, r] of map) {
        if (offset >= r.start && offset < r.end && r.end - r.start < bestLen) {
            best = id;
            bestLen = r.end - r.start;
        }
    }
    return best;
}

type ElementRange = { start: number; end: number; };

/**
 * Text range of the first rule of each class in the `<style>` elements among `elements`.
 * The range covers the whole rule, from its selector to its closing brace (a deactivated rule included).
 */
function classRuleRanges(text: string, elements: readonly ElementRange[]): Map<string, ElementRange> {
    const rv = new Map<string, ElementRange>();
    for (const el of elements) {
        if (!/^<style[\s>]/i.test(text.slice(el.start, el.start + 7))) {
            continue;
        }
        const open = text.indexOf('>', el.start) + 1;
        const close = text.lastIndexOf('</', el.end);
        if (open <= 0 || close < open) {
            continue;
        }
        const css = text.slice(open, close);
        for (const rule of cssRulesOf(css)) {
            for (const sel of rule.selectors) {
                const name = /^\.([A-Za-z_][\w-]*)$/.exec(sel)?.[1];
                if (name && !rv.has(name)) {
                    rv.set(name, { start: open + rule.start, end: open + rule.end });
                }
            }
        }
    }
    return rv;
}

/**
 * Text ranges of the deactivated elements inside the `<defs>` element `defsEl` (its range in `text`).
 * `n` numbers the blocks; `k` is 0 for the element of a block (its range is the whole comment) and the
 * pre-order index of a nested element otherwise.
 */
function offBlockRanges(text: string, defsEl: ElementRange): { n: number; k: number; r: ElementRange; }[] {
    const rv: { n: number; k: number; r: ElementRange; }[] = [];
    const inner = text.slice(defsEl.start, defsEl.end);
    offBlocksOf(inner).forEach((b, n) => {
        const contentStart = defsEl.start + b.contentStart;
        const content = text.slice(contentStart, defsEl.start + b.contentEnd);
        scanElements(content).forEach((r, k) => {
            rv.push(k === 0
                ? { n, k, r: { start: defsEl.start + b.start, end: defsEl.start + b.end } }
                : { n, k, r: { start: contentStart + r.start, end: contentStart + r.end } });
        });
    });
    return rv;
}

/** Element ranges in order of their start tags (document pre-order) */
export function scanElements(text: string): ElementRange[] {
    const rv: ElementRange[] = [];
    const stack: number[] = []; // indices into rv
    let i = 0;
    const n = text.length;

    while (i < n) {
        const lt = text.indexOf('<', i);
        if (lt === -1) {
            break;
        }

        if (text.startsWith('<!--', lt)) {
            i = skipTo(text, lt + 4, '-->');
            continue;
        }
        if (text.startsWith('<![CDATA[', lt)) {
            i = skipTo(text, lt + 9, ']]>');
            continue;
        }
        if (text.startsWith('<?', lt)) {
            i = skipTo(text, lt + 2, '?>');
            continue;
        }
        if (text.startsWith('<!', lt)) {
            i = skipDoctype(text, lt + 2);
            continue;
        }

        if (text[lt + 1] === '/') {
            const gt = text.indexOf('>', lt);
            const end = gt === -1 ? n : gt + 1;
            const open = stack.pop();
            if (open !== undefined) {
                rv[open].end = end;
            }
            i = end;
            continue;
        }

        // start tag: find the closing '>' outside of quoted attribute values
        let j = lt + 1;
        let quote = '';
        while (j < n) {
            const ch = text[j];
            if (quote) {
                if (ch === quote) {
                    quote = '';
                }
            } else if (ch === '"' || ch === "'") {
                quote = ch;
            } else if (ch === '>') {
                break;
            }
            j++;
        }

        const selfClosing = text[j - 1] === '/';
        const end = Math.min(n, j + 1);
        rv.push({ start: lt, end });
        if (!selfClosing) {
            stack.push(rv.length - 1);
        }
        i = end;
    }
    return rv;
}

function skipTo(text: string, from: number, marker: string): number {
    const k = text.indexOf(marker, from);
    return k === -1 ? text.length : k + marker.length;
}

function skipDoctype(text: string, from: number): number {
    let depth = 0;
    for (let k = from; k < text.length; k++) {
        const ch = text[k];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        else if (ch === '>' && depth <= 0) return k + 1;
    }
    return text.length;
}

function computeLineStarts(text: string): number[] {
    const rv = [0];
    for (let k = 0; k < text.length; k++) {
        if (text.charCodeAt(k) === 10) {
            rv.push(k + 1);
        }
    }
    return rv;
}

function lineOf(lineStarts: number[], offset: number): number {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (lineStarts[mid] <= offset) {
            lo = mid;
        } else {
            hi = mid - 1;
        }
    }
    return lo + 1;
}
