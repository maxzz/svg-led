import { type Attrs, type SvgDoc, type SvgNode } from "../1-model/1-types";
import { escapeAttr, makeFmt } from "./1-format";

export type SerializeOptions = {
    precision: number;
    indent?: string;
    includeNoneValues?: boolean; // Keep fill="none" / stroke="none" attributes; default true
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Writes the document as pretty-printed SVG, one element per line */
export function serializeSvg(doc: SvgDoc, options: SerializeOptions): string {
    const f = makeFmt(options.precision);
    const indent = options.indent ?? '    ';
    const includeNone = options.includeNoneValues ?? true;

    const rootAttrs: [string, string][] = [];
    rootAttrs.push(['xmlns', doc.rootAttrs.xmlns ?? SVG_NS]);
    if (doc.viewBox) {
        const v = doc.viewBox;
        rootAttrs.push(['viewBox', `${f(v.x)} ${f(v.y)} ${f(v.width)} ${f(v.height)}`]);
    }
    for (const [k, v] of Object.entries(doc.rootAttrs)) {
        if (k !== 'xmlns' && (includeNone || !isNoneAttr(k, v))) {
            rootAttrs.push([k, v]);
        }
    }

    const lines: string[] = [];
    if (!doc.children.length) {
        lines.push(`<svg${attrsText(rootAttrs)}/>`);
    } else {
        lines.push(`<svg${attrsText(rootAttrs)}>`);
        for (const node of doc.children) {
            writeNode(node, 1, lines, f, indent, includeNone);
        }
        lines.push('</svg>');
    }
    return lines.join('\n') + '\n';
}

/** Writes nodes as an SVG fragment (used for clipboard copy) */
export function serializeNodes(nodes: readonly SvgNode[], options: SerializeOptions): string {
    const f = makeFmt(options.precision);
    const lines: string[] = [];
    const includeNone = options.includeNoneValues ?? true;

    for (const node of nodes) {
        writeNode(node, 0, lines, f, options.indent ?? '    ', includeNone);
    }
    return lines.join('\n');
}

function writeNode(node: SvgNode, depth: number, lines: string[], f: (n: number) => string, indent: string, includeNone: boolean): void {
    const pad = indent.repeat(depth);
    const tag = node.kind === 'passthrough' ? node.tag : node.kind;
    const attrs = attrsText(nodeAttrs(node, f, includeNone));

    if (node.kind === 'g') {
        if (!node.children.length) {
            lines.push(`${pad}<g${attrs}/>`);
            return;
        }

        lines.push(`${pad}<g${attrs}>`);
        for (const child of node.children) {
            writeNode(child, depth + 1, lines, f, indent, includeNone);
        }
        lines.push(`${pad}</g>`);
        return;
    }

    if (node.kind === 'passthrough' && node.inner) {
        lines.push(`${pad}<${tag}${attrs}>${node.inner}</${tag}>`);
        return;
    }

    lines.push(`${pad}<${tag}${attrs}/>`);
}

/**
 * User id attribute first, then geometry, then the remaining attributes in source order. Path `d` is always last.
 * `includeNone` false leaves out `fill="none"` and `stroke="none"`.
 */
export function nodeAttrs(node: SvgNode, f: (n: number) => string, includeNone = true): [string, string][] {
    const rv: [string, string][] = [];
    if (node.attrs.id !== undefined) {
        rv.push(['id', node.attrs.id]);
    }

    switch (node.kind) {
        case 'path':
            // `d` is pushed after the other attributes below
            break;
        case 'rect':
            rv.push(['x', f(node.x)], ['y', f(node.y)], ['width', f(node.width)], ['height', f(node.height)]);
            if (node.rx || node.ry) {
                rv.push(['rx', f(node.rx)]);
                if (node.ry !== node.rx) {
                    rv.push(['ry', f(node.ry)]);
                }
            }
            break;
        case 'circle':
            rv.push(['cx', f(node.cx)], ['cy', f(node.cy)], ['r', f(node.r)]);
            break;
        case 'ellipse':
            rv.push(['cx', f(node.cx)], ['cy', f(node.cy)], ['rx', f(node.rx)], ['ry', f(node.ry)]);
            break;
        case 'line':
            rv.push(['x1', f(node.x1)], ['y1', f(node.y1)], ['x2', f(node.x2)], ['y2', f(node.y2)]);
            break;
        case 'polyline':
        case 'polygon':
            rv.push(['points', node.points.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')]);
            break;
    }

    for (const [k, v] of Object.entries(node.attrs)) {
        if (k !== 'id' && (includeNone || !isNoneAttr(k, v))) {
            rv.push([k, v]);
        }
    }
    if (node.kind === 'path') {
        rv.push(['d', node.d]);
    }
    return rv;
}

/** `fill="none"` and `stroke="none"`: the attributes that the "include none values" export option controls */
export function isNoneAttr(name: string, value: string): boolean {
    return (name === 'fill' || name === 'stroke') && value.trim() === 'none';
}

function attrsText(attrs: [string, string][] | Attrs): string {
    const list = Array.isArray(attrs) ? attrs : Object.entries(attrs);
    return list.map(([k, v]) => ` ${k}="${escapeAttr(v)}"`).join('');
}
