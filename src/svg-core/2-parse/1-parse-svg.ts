import { type Attrs, type Point, type SvgDoc, type SvgNode, type ViewBox } from "../1-model/1-types";
import { newNodeId } from "../1-model/2-node-ids";

export type ParseSvgResult =
    | { ok: true; doc: SvgDoc; }
    | { ok: false; error: string; };

//---------------------------------------------------------------------------

/** Parses SVG source text into the editor model. Uses the browser DOMParser. */
export function parseSvg(text: string): ParseSvgResult {
    const dom = new DOMParser().parseFromString(text, 'image/svg+xml');

    const err = dom.getElementsByTagName('parsererror')[0];
    if (err) {
        // Chromium wraps the message in <div> between two <h3> captions; Firefox puts it first
        const message = err.querySelector('div')?.textContent ?? err.textContent ?? '';
        return { ok: false, error: message.trim().split('\n')[0] || 'Invalid SVG' };
    }

    const root = dom.documentElement;
    if (!root || root.localName !== 'svg') {
        return { ok: false, error: 'The root element is not <svg>' };
    }

    const rootAttrs = readAttrs(root);
    const viewBox = parseViewBox(rootAttrs.viewBox);
    delete rootAttrs.viewBox;

    return {
        ok: true,
        doc: {
            viewBox,
            rootAttrs,
            children: readChildren(root),
        },
    };
}

//---------------------------------------------------------------------------

/** Parses an SVG fragment (one or more elements) using the namespace of an <svg> wrapper */
export function parseSvgFragment(markup: string): SvgNode[] | undefined {
    const rv = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${markup}</svg>`);
    return rv.ok ? rv.doc.children : undefined;
}

//---------------------------------------------------------------------------

export function parseViewBox(text: string | undefined): ViewBox | null {
    if (!text) {
        return null;
    }
    const n = text.trim().split(/[\s,]+/).map(Number);
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v)) || n[2] <= 0 || n[3] <= 0) {
        return null;
    }
    return { x: n[0], y: n[1], width: n[2], height: n[3] };
}

//---------------------------------------------------------------------------

function readChildren(parent: Element): SvgNode[] {
    const rv: SvgNode[] = [];
    for (const el of Array.from(parent.children)) {
        rv.push(readElement(el));
    }
    return rv;
}

function readElement(el: Element): SvgNode {
    const attrs = readAttrs(el);
    const id = newNodeId();

    switch (el.localName) {
        case 'path': {
            const d = take(attrs, 'd') ?? '';
            return { id, kind: 'path', d, attrs };
        }
        case 'rect': {
            const nums = takeNumbers(attrs, ['x', 'y', 'width', 'height']);
            const rxText = attrs.rx;
            const ryText = attrs.ry;
            const rx = num(rxText ?? ryText);
            const ry = num(ryText ?? rxText);
            if (nums && rx !== null && ry !== null) {
                delete attrs.rx;
                delete attrs.ry;
                return { id, kind: 'rect', x: nums.x, y: nums.y, width: nums.width, height: nums.height, rx, ry, attrs };
            }
            break;
        }
        case 'circle': {
            const nums = takeNumbers(attrs, ['cx', 'cy', 'r']);
            if (nums) {
                return { id, kind: 'circle', cx: nums.cx, cy: nums.cy, r: nums.r, attrs };
            }
            break;
        }
        case 'ellipse': {
            const nums = takeNumbers(attrs, ['cx', 'cy', 'rx', 'ry']);
            if (nums) {
                return { id, kind: 'ellipse', cx: nums.cx, cy: nums.cy, rx: nums.rx, ry: nums.ry, attrs };
            }
            break;
        }
        case 'line': {
            const nums = takeNumbers(attrs, ['x1', 'y1', 'x2', 'y2']);
            if (nums) {
                return { id, kind: 'line', x1: nums.x1, y1: nums.y1, x2: nums.x2, y2: nums.y2, attrs };
            }
            break;
        }
        case 'polyline':
        case 'polygon': {
            const points = parsePoints(take(attrs, 'points') ?? '');
            return { id, kind: el.localName, points, attrs };
        }
        case 'g': {
            return { id, kind: 'g', children: readChildren(el), attrs };
        }
    }

    return { id, kind: 'passthrough', tag: el.tagName, inner: el.innerHTML.trim(), attrs: readAttrs(el) };
}

function readAttrs(el: Element): Attrs {
    const rv: Attrs = {};
    for (const a of Array.from(el.attributes)) {
        rv[a.name] = a.value;
    }
    return rv;
}

function take(attrs: Attrs, name: string): string | undefined {
    const v = attrs[name];
    delete attrs[name];
    return v;
}

/** Plain numbers or px only; anything with other units stays a passthrough element */
function num(text: string | undefined): number | null {
    if (text === undefined || text === '') {
        return 0;
    }
    const t = text.trim();
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?(px)?$/.test(t)) {
        return null;
    }
    return parseFloat(t);
}

function takeNumbers<K extends string>(attrs: Attrs, names: K[]): Record<K, number> | undefined {
    const rv = {} as Record<K, number>;
    for (const name of names) {
        const n = num(attrs[name]);
        if (n === null) {
            return undefined;
        }
        rv[name] = n;
    }
    for (const name of names) {
        delete attrs[name];
    }
    return rv;
}

export function parsePoints(text: string): Point[] {
    const n = text.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const rv: Point[] = [];
    for (let i = 0; i + 1 < n.length; i += 2) {
        rv.push({ x: n[i], y: n[i + 1] });
    }
    return rv;
}
