import { type SvgDoc, type SvgNode } from "../1-model/1-types";

/** Position of one element in the source text; lines are 1-based like in Monaco */
export type SourceRange = {
    start: number;               // offset of '<'
    end: number;                 // offset after the closing '>'
    startLine: number;
    endLine: number;
};

export type SourceMap = Map<string, SourceRange>;

/** Separates the id of a `<defs>` element from the index of an element inside it: `<defsId>/<index>` */
export const DEFS_ITEM_SEP = '/';

/** Id of the element at pre-order `index` inside a `<defs>` element (index 0 is its first descendant) */
export function defsElementId(defsId: string, index: number): string {
    return `${defsId}${DEFS_ITEM_SEP}${index}`;
}

/** Splits an id made by `defsElementId`; undefined for ordinary node ids */
export function parseDefsElementId(id: string): { defsId: string; index: number; } | undefined {
    const i = id.lastIndexOf(DEFS_ITEM_SEP);
    if (i <= 0) {
        return undefined;
    }
    const index = Number(id.slice(i + 1));
    return Number.isInteger(index) && index >= 0 ? { defsId: id.slice(0, i), index } : undefined;
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
