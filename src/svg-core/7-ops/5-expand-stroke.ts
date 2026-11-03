import { EndType, FillRule, JoinType, ellipseD, inflatePathsD, unionD, type PathD } from "clipper2-ts";
import { type Attrs, type PathNode, type Point, type SubPath, type SvgNode } from "../1-model/1-types";
import { newNodeId } from "../1-model/2-node-ids";
import { walkNodes } from "../1-model/3-tree";
import { parsePathData } from "../2-parse/2-parse-path-data";
import { fmtNum } from "../3-serialize/1-format";
import { arcToCubics, quadToCubic, splitCubic } from "../4-geometry/2-bezier";
import { fitClosedPolyline } from "../4-geometry/5-fit-curve";
import { subpathsToPathData } from "../5-anchors/1-path-anchors";
import { getPresentation, isPaintVisible, parseStyle, setPresentation } from "../8-style/1-presentation";

/**
 * Expand turns the painted appearance of a path into filled geometry.
 *
 * A path with no visible stroke is left alone. The stroke is outlined (width, caps, joins,
 * miter limit and dashes). When the fill is the same fully opaque color, fill and stroke
 * become one path. When the paints differ, the original fill stays and the stroke outline
 * is a second path on top of it, so both colors remain.
 *
 * Lengths in units other than user units or px (percentages, em) are not expanded: they
 * depend on the viewport. `vector-effect="non-scaling-stroke"` is left alone for the same reason.
 */

const CLIP_PREC = 4;
const STROKE_PROPS = [
    'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
    'stroke-miterlimit', 'stroke-opacity', 'vector-effect',
] as const;
const MARKER_PROPS = ['marker-start', 'marker-mid', 'marker-end'] as const;

type Cap = 'butt' | 'round' | 'square';
type Join = 'miter' | 'round' | 'bevel';

type StrokeStyle = {
    width: number;
    color: string;
    opacity: number;
    cap: Cap;
    join: Join;
    miterLimit: number;
    dash: number[] | null;
    dashOffset: number;
};

/** One stylesheet rule that sets properties on a single class (`.name`), in source order */
export type ClassRule = { classes: string[]; decl: Record<string, string>; };

type Styled = { attrs: Attrs };

type FillStyle = {
    color: string;
    opacity: number;
    rule: FillRule;
};

type Polyline = { pts: Point[]; closed: boolean };
type Ancestor = { attrs: Attrs };

//---------------------------------------------------------------------------

/**
 * Class rules from `<style>` elements. Illustrator-style SVG keeps the stroke on a class,
 * and a class beats a presentation attribute, so Expand reads it.
 * Only single class selectors are used (`.name` and `.a, .b`).
 */
export function classRulesOf(nodes: readonly SvgNode[]): ClassRule[] {
    const css: string[] = [];
    walkNodes(nodes, (node) => {
        if (node.kind !== 'passthrough') {
            return;
        }
        if (node.tag.toLowerCase() === 'style') {
            css.push(node.inner);
        } else if (node.inner.includes('<style')) {
            for (const match of node.inner.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
                css.push(match[1]);
            }
        }
    });

    const rules: ClassRule[] = [];
    const text = css.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!\[CDATA\[|\]\]>/g, '');
    for (const match of text.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
        const classes = match[1].split(',').map((sel) => /^\.([A-Za-z_][\w-]*)$/.exec(sel.trim())?.[1]).filter((name): name is string => !!name);
        if (!classes.length) {
            continue;
        }
        const decl: Record<string, string> = {};
        for (const [key, value] of Object.entries(parseStyle(match[2]))) {
            decl[key] = value.replace(/\s*!important\s*$/i, '').trim();
        }
        rules.push({ classes, decl });
    }
    return rules;
}

export function canExpandPath(node: PathNode, parents: readonly Ancestor[] = [], rootAttrs?: Attrs, rules: readonly ClassRule[] = []): boolean {
    return readStroke(paintChain(node, parents, rootAttrs), rules) !== undefined;
}

/** Replacement nodes, or undefined when this path has nothing to expand */
export function expandPathNode(node: PathNode, parents: readonly Ancestor[] = [], precision = 3, rootAttrs?: Attrs, rules: readonly ClassRule[] = []): PathNode[] | undefined {
    const chain = paintChain(node, parents, rootAttrs);
    const stroke = readStroke(chain, rules);
    if (!stroke) {
        return undefined;
    }

    const res = resolutionFor(node.d, stroke.width / 2);
    const polys = polylinesOf(node.d, res.flat);
    const pieces = polys.flatMap((poly) => strokePieces(poly, stroke, res));
    const outlined = unite(pieces, FillRule.NonZero, res.clipPrec);
    if (!outlined.length) {
        return undefined;
    }

    const fill = readFill(chain, rules);
    const fillContours = fill ? unite(polys.filter((p) => p.pts.length >= 3).map((p) => p.pts), fill.rule, res.clipPrec) : [];

    // Opaque paint of one color composites to the union. A second color, or a translucent one, has to stay its own path.
    if (fill && fillContours.length && fill.opacity >= 1 && stroke.opacity >= 1 && samePaint(fill.color, stroke.color)) {
        const merged = unite([...fillContours, ...outlined], FillRule.NonZero, res.clipPrec);
        if (!merged.length) {
            return undefined;
        }
        return [filledPath(node, merged, fill.color, 1, precision, true, chain, rules, res)];
    }

    const result: PathNode[] = [];
    if (fill && fillContours.length) {
        result.push(unstroked(node, fill, precision, chain, rules));
    }
    result.push(filledPath(node, outlined, stroke.color, stroke.opacity, precision, result.length === 0, chain, rules, res));
    return result;
}

/**
 * How finely curves are flattened before outlining, and how the outline is refitted with curves.
 * Curved parts are split into short, slightly turning steps, so the far side of a wide stroke stays
 * smooth and any longer edge in the outline can be taken as a straight line.
 */
type Resolution = {
    flat: Flatness;
    fitTol: number;
    minLine: number;
    arcTol: number;
    clipPrec: number;
};

function resolutionFor(d: string, radius: number): Resolution {
    const size = extentOf(d);
    const tol = Math.max(Math.min(size * 2e-4, radius * 0.1, 0.05), size * 1e-5, 1e-5);
    const maxTurn = Math.min(0.15, Math.sqrt((8 * tol) / radius));
    const maxStep = Math.max(size, radius) / 24;
    return {
        flat: { tol, maxTurn, maxStep },
        fitTol: Math.max(tol * 2, Math.min(size * 6e-4, radius * 0.25, 0.15)),
        minLine: 1.5 * (maxStep + radius * maxTurn) + tol * 4,
        arcTol: Math.min(tol, radius * 0.005),
        clipPrec: Math.min(8, Math.max(CLIP_PREC, Math.ceil(Math.log10(100 / tol)))),
    };
}

function extentOf(d: string): number {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const seg of parsePathData(d)) {
        const pts = seg.c === 'C' ? [seg.c1, seg.c2, seg.p] : seg.c === 'Q' ? [seg.q, seg.p] : seg.c === 'Z' ? [] : [seg.p];
        for (const p of pts) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
    }
    const size = Math.max(maxX - minX, maxY - minY);
    return Number.isFinite(size) ? size : 0;
}

function paintChain(node: PathNode, parents: readonly Ancestor[], rootAttrs: Attrs | undefined): Styled[] {
    const chain: Styled[] = [node, ...[...parents].reverse()];
    if (rootAttrs) {
        chain.push({ attrs: rootAttrs });
    }
    return chain;
}

//---------------------------------------------------------------------------
// Paint

function readStroke(chain: readonly Styled[], rules: readonly ClassRule[]): StrokeStyle | undefined {
    const vectorEffect = inherited(chain, rules, 'vector-effect');
    if (vectorEffect?.split(/[\s,]+/).includes('non-scaling-stroke')) {
        return undefined;
    }

    const color = inherited(chain, rules, 'stroke');
    if (color === undefined || !paintShows(color, 'stroke')) {
        return undefined;
    }

    const width = widthOf(inherited(chain, rules, 'stroke-width'));
    const opacity = opacityOf(inherited(chain, rules, 'stroke-opacity'));
    if (width === undefined || !(opacity > 0)) {
        return undefined;
    }

    const dash = dashOf(inherited(chain, rules, 'stroke-dasharray'));
    if (dash === 'bad' || (dash && dash.reduce((sum, n) => sum + n, 0) <= 0)) {
        return undefined;
    }
    const dashOffset = offsetOf(inherited(chain, rules, 'stroke-dashoffset'));
    if (dashOffset === undefined) {
        return undefined;
    }

    return {
        width,
        color,
        opacity,
        cap: capOf(inherited(chain, rules, 'stroke-linecap')),
        join: joinOf(inherited(chain, rules, 'stroke-linejoin')),
        miterLimit: miterOf(inherited(chain, rules, 'stroke-miterlimit')),
        dash,
        dashOffset,
    };
}

function readFill(chain: readonly Styled[], rules: readonly ClassRule[]): FillStyle | undefined {
    const color = inherited(chain, rules, 'fill');
    if (color !== undefined && !paintShows(color, 'fill')) {
        return undefined;
    }
    const opacity = opacityOf(inherited(chain, rules, 'fill-opacity'));
    if (!(opacity > 0)) {
        return undefined;
    }
    const rule = inherited(chain, rules, 'fill-rule')?.trim().toLowerCase() === 'evenodd' ? FillRule.EvenOdd : FillRule.NonZero;
    return { color: color ?? '#000000', opacity, rule };
}

/** Style attribute, then class rules, then the presentation attribute. A class wins over the attribute, as in SVG. */
function inherited(chain: readonly Styled[], rules: readonly ClassRule[], prop: string): string | undefined {
    for (const item of chain) {
        const styled = parseStyle(item.attrs.style ?? '')[prop];
        if (isSet(styled)) {
            return styled;
        }
        const fromClass = classProp(rules, item.attrs.class, prop);
        if (isSet(fromClass)) {
            return fromClass;
        }
        if (isSet(item.attrs[prop])) {
            return item.attrs[prop];
        }
    }
    return undefined;
}

function classProp(rules: readonly ClassRule[], classAttr: string | undefined, prop: string): string | undefined {
    if (!classAttr) {
        return undefined;
    }
    const names = new Set(classAttr.trim().split(/\s+/));
    let found: string | undefined;
    for (const rule of rules) {
        if (rule.classes.some((name) => names.has(name)) && prop in rule.decl) {
            found = rule.decl[prop];
        }
    }
    return found;
}

function isSet(value: string | undefined): value is string {
    return value !== undefined && value.trim().toLowerCase() !== 'inherit';
}

function paintShows(color: string, kind: 'fill' | 'stroke'): boolean {
    return color.trim() !== '' && isPaintVisible(color, kind);
}

function samePaint(a: string, b: string): boolean {
    return a.trim().toLowerCase().replace(/\s+/g, '') === b.trim().toLowerCase().replace(/\s+/g, '');
}

/** User-unit length, or undefined for anything else (including 0 and negative) */
function widthOf(value: string | undefined): number | undefined {
    if (value === undefined) {
        return 1;
    }
    const n = userUnit(value);
    return n !== undefined && n > 0 ? n : undefined;
}

function offsetOf(value: string | undefined): number | undefined {
    if (value === undefined) {
        return 0;
    }
    return userUnit(value);
}

function userUnit(text: string): number | undefined {
    const t = text.trim();
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(t)) {
        return undefined;
    }
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : undefined;
}

/** null is a solid stroke; 'bad' is a dash the expander cannot resolve */
function dashOf(value: string | undefined): number[] | null | 'bad' {
    if (value === undefined) {
        return null;
    }
    const t = value.trim();
    if (t === '' || t.toLowerCase() === 'none') {
        return null;
    }
    const nums: number[] = [];
    for (const part of t.split(/[\s,]+/).filter(Boolean)) {
        const n = userUnit(part);
        if (n === undefined || n < 0) {
            return 'bad';
        }
        nums.push(n);
    }
    return nums;
}

function opacityOf(value: string | undefined): number {
    if (value === undefined) {
        return 1;
    }
    const t = value.trim();
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n)) {
        return 1;
    }
    const factor = t.endsWith('%') ? n / 100 : n;
    return Math.min(1, Math.max(0, factor));
}

function capOf(value: string | undefined): Cap {
    const v = value?.trim().toLowerCase();
    return v === 'round' || v === 'square' ? v : 'butt';
}

function joinOf(value: string | undefined): Join {
    const v = value?.trim().toLowerCase();
    return v === 'round' || v === 'bevel' ? v : 'miter';
}

function miterOf(value: string | undefined): number {
    if (value === undefined) {
        return 4;
    }
    const n = userUnit(value);
    return n !== undefined && n >= 1 ? n : 4;
}

//---------------------------------------------------------------------------
// Result nodes

function unstroked(node: PathNode, fill: FillStyle, precision: number, chain: readonly Styled[], rules: readonly ClassRule[]): PathNode {
    const attrs = { ...node.attrs };
    stripStroke(attrs, false);
    setPresentation(attrs, 'fill', fill.color);
    setPresentation(attrs, 'fill-opacity', fill.opacity >= 1 ? undefined : fmtNum(fill.opacity, Math.max(precision, 3)));
    dropClass(attrs, chain, rules);
    return { id: node.id, kind: 'path', d: node.d, attrs };
}

function filledPath(node: PathNode, polys: PathD[], fill: string, fillOpacity: number, precision: number, keepId: boolean, chain: readonly Styled[], rules: readonly ClassRule[], res: Resolution): PathNode {
    const attrs = { ...node.attrs };
    stripStroke(attrs, true);
    setPresentation(attrs, 'fill', fill);
    setPresentation(attrs, 'fill-opacity', fillOpacity >= 1 ? undefined : fmtNum(fillOpacity, Math.max(precision, 3)));
    const d = polysToD(polys, precision, res);
    setPresentation(attrs, 'fill-rule', d.split('M').length > 2 ? 'nonzero' : undefined);
    dropClass(attrs, chain, rules);
    if (!keepId) {
        delete attrs.id;
    }
    return { id: keepId ? node.id : newNodeId(), kind: 'path', d, attrs };
}

/** A class rule overrides presentation attributes, so a leftover class would paint the stroke again */
function dropClass(attrs: Attrs, chain: readonly Styled[], rules: readonly ClassRule[]): void {
    if (!attrs.class) {
        return;
    }
    const opacity = inherited(chain, rules, 'opacity');
    if (opacity !== undefined && getPresentation(attrs, 'opacity') === undefined) {
        setPresentation(attrs, 'opacity', opacity);
    }
    delete attrs.class;
}

function stripStroke(attrs: Attrs, markers: boolean): void {
    for (const prop of STROKE_PROPS) {
        setPresentation(attrs, prop, undefined);
    }
    if (markers) {
        for (const prop of MARKER_PROPS) {
            setPresentation(attrs, prop, undefined);
        }
    }
    setPresentation(attrs, 'stroke', 'none');
}

/** Each ring is refitted with curves: straight edges stay lines, flattened curves become cubics again */
function polysToD(polys: readonly PathD[], precision: number, res: Resolution): string {
    const subs = polys
        .map((poly) => fitClosedPolyline(dedupe(poly.map((p) => ({ x: p.x, y: p.y })), true), res.fitTol, res.minLine))
        .filter((sub): sub is SubPath => !!sub);
    return subpathsToPathData(subs, precision);
}

//---------------------------------------------------------------------------
// Stroke outline

function strokePieces(poly: Polyline, stroke: StrokeStyle, res: Resolution): PathD[] {
    const closed = poly.closed && poly.pts.length >= 3;
    if (stroke.dash) {
        return dashPieces(poly.pts, closed, stroke, res);
    }
    return solidPieces(poly.pts, closed, stroke, res);
}

function solidPieces(pts: Point[], closed: boolean, stroke: StrokeStyle, res: Resolution): PathD[] {
    const radius = stroke.width / 2;
    const length = polyLength(pts, closed);
    if (pts.length === 0 || length <= 1e-9) {
        return pointMark(pts[0], radius, stroke.cap, res);
    }
    const end = closed ? EndType.Joined : stroke.cap === 'round' ? EndType.Round : stroke.cap === 'square' ? EndType.Square : EndType.Butt;
    const join = stroke.join === 'round' ? JoinType.Round : stroke.join === 'bevel' ? JoinType.Bevel : JoinType.Miter;
    return inflatePathsD([pts], radius, join, end, stroke.miterLimit, res.clipPrec, res.arcTol).map(cleanRing);
}

function pointMark(p: Point | undefined, radius: number, cap: Cap, res: Resolution): PathD[] {
    if (!p || cap === 'butt' || !(radius > 0)) {
        return [];
    }
    if (cap === 'square') {
        return [[
            { x: p.x + radius, y: p.y + radius },
            { x: p.x - radius, y: p.y + radius },
            { x: p.x - radius, y: p.y - radius },
            { x: p.x + radius, y: p.y - radius },
        ]];
    }
    const steps = Math.max(24, Math.ceil(Math.PI / Math.acos(Math.min(1, Math.max(-1, 1 - res.arcTol / radius)))));
    return [ellipseD({ x: p.x, y: p.y }, radius, radius, steps)];
}

function unite(paths: PathD[], rule: FillRule, clipPrec: number): PathD[] {
    const clean = paths.filter((p) => p.length >= 3);
    if (clean.length === 0) {
        return [];
    }
    if (clean.length === 1) {
        return clean;
    }
    return unionD(clean, [], rule, clipPrec).map(cleanRing);
}

function cleanRing(path: PathD): PathD {
    return dedupe(path.map((p) => ({ x: p.x, y: p.y })), true);
}

//---------------------------------------------------------------------------
// Dashes. Each subpath restarts the pattern. A dash that crosses the close of a
// closed path is one piece, so the join is not capped in the middle.

function dashPieces(pts: Point[], closed: boolean, stroke: StrokeStyle, res: Resolution): PathD[] {
    const lens = segLens(pts, closed);
    const total = lens.reduce((sum, n) => sum + n, 0);
    if (total <= 1e-9) {
        return pointMark(pts[0], stroke.width / 2, stroke.cap, res);
    }

    const solid = { ...stroke, dash: null };
    const out: PathD[] = [];
    for (const span of dashSpans(total, stroke.dash!, stroke.dashOffset, closed)) {
        if (span.b - span.a <= 1e-9) {
            out.push(...pointMark(pointAlong(pts, lens, span.a), stroke.width / 2, stroke.cap, res));
            continue;
        }
        if (closed && span.b - span.a >= total - 1e-6) {
            out.push(...solidPieces(pts, true, solid, res));
            continue;
        }
        const piece = span.b > total + 1e-8
            ? concatSlices(pts, lens, span.a, total, span.b - total)
            : slicePoly(pts, lens, span.a, Math.min(span.b, total));
        if (piece.length >= 2) {
            out.push(...solidPieces(piece, false, solid, res));
        } else if (piece.length === 1) {
            out.push(...pointMark(piece[0], stroke.width / 2, stroke.cap, res));
        }
    }
    return out;
}

function dashSpans(length: number, pattern: number[], dashOffset: number, closed: boolean): { a: number; b: number; }[] {
    const pat = pattern.length % 2 === 1 ? pattern.concat(pattern) : pattern;
    const patLen = pat.reduce((sum, n) => sum + n, 0);
    if (!(patLen > 0) || !(length > 0)) {
        return [];
    }

    let phase = dashOffset % patLen;
    if (phase < 0) {
        phase += patLen;
    }
    let idx = 0;
    let into = phase;
    for (let guard = 0; into > 1e-12 && guard < pat.length + 1; guard++) {
        if (pat[idx] <= 1e-12) {
            idx = (idx + 1) % pat.length;
            continue;
        }
        if (into < pat[idx]) {
            break;
        }
        into -= pat[idx];
        idx = (idx + 1) % pat.length;
    }

    const spans: { a: number; b: number; }[] = [];
    let dist = 0;
    let left = Math.max(0, pat[idx] - into);
    let drawing = idx % 2 === 0;
    for (let guard = 0; dist < length - 1e-9 && guard < 100000; guard++) {
        if (left <= 1e-12) {
            // A zero-length dash still draws a round or square cap. `left` is also 0 after a real dash is used up; that one is not a cap.
            if (drawing && pat[idx] <= 1e-12) {
                spans.push({ a: dist, b: dist });
            }
            let skipped = 0;
            do {
                idx = (idx + 1) % pat.length;
            } while (pat[idx] <= 1e-12 && ++skipped < pat.length);
            left = pat[idx];
            drawing = idx % 2 === 0;
            continue;
        }
        const step = Math.min(left, length - dist);
        if (drawing && step > 1e-9) {
            spans.push({ a: dist, b: dist + step });
        }
        dist += step;
        left -= step;
    }

    const merged: { a: number; b: number; }[] = [];
    for (const span of spans) {
        if (span.a < 1e-6) {
            span.a = 0;
        }
        if (Math.abs(span.b - length) < 1e-6) {
            span.b = length;
        }
        const prev = merged[merged.length - 1];
        if (prev && Math.abs(prev.b - span.a) < 1e-6) {
            prev.b = span.b;
        } else {
            merged.push(span);
        }
    }

    if (closed && merged.length >= 2 && merged[0].a === 0 && merged[merged.length - 1].b === length) {
        const first = merged[0];
        const last = merged[merged.length - 1];
        merged[0] = { a: last.a, b: length + first.b };
        merged.pop();
    }
    return merged;
}

function segLens(pts: readonly Point[], closed: boolean): number[] {
    const n = pts.length;
    const count = closed ? n : Math.max(0, n - 1);
    const lens: number[] = [];
    for (let i = 0; i < count; i++) {
        lens.push(Math.hypot(pts[(i + 1) % n].x - pts[i].x, pts[(i + 1) % n].y - pts[i].y));
    }
    return lens;
}

function polyLength(pts: readonly Point[], closed: boolean): number {
    return segLens(pts, closed).reduce((sum, n) => sum + n, 0);
}

function slicePoly(pts: readonly Point[], lens: readonly number[], d0: number, d1: number): Point[] {
    if (!(d1 > d0)) {
        return [];
    }
    const prefix = [0];
    for (const len of lens) {
        prefix.push(prefix[prefix.length - 1] + len);
    }
    const out: Point[] = [pointAlong(pts, lens, d0)];
    for (let k = 1; k < pts.length; k++) {
        const at = prefix[k];
        if (at > d0 + 1e-7 && at < d1 - 1e-7) {
            out.push(pts[k]);
        }
    }
    out.push(pointAlong(pts, lens, d1));
    return dedupe(out, false);
}

function concatSlices(pts: readonly Point[], lens: readonly number[], from: number, total: number, to: number): Point[] {
    const head = slicePoly(pts, lens, from, total);
    const tail = slicePoly(pts, lens, 0, to);
    if (!head.length) {
        return tail;
    }
    if (!tail.length) {
        return head;
    }
    const last = head[head.length - 1];
    const rest = Math.hypot(last.x - tail[0].x, last.y - tail[0].y) < 1e-6 ? tail.slice(1) : tail;
    return dedupe(head.concat(rest), false);
}

function pointAlong(pts: readonly Point[], lens: readonly number[], dist: number): Point {
    const total = lens.reduce((sum, n) => sum + n, 0);
    const closed = lens.length === pts.length;
    if (dist <= 0) {
        return pts[0];
    }
    if (dist >= total - 1e-12) {
        return closed ? pts[0] : pts[pts.length - 1];
    }
    let d = dist;
    for (let i = 0; i < lens.length; i++) {
        const len = lens[i];
        if (d <= len || i === lens.length - 1) {
            const t = len > 1e-12 ? d / len : 0;
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        }
        d -= len;
    }
    return pts[0];
}

//---------------------------------------------------------------------------
// Flatten

function polylinesOf(d: string, flat: Flatness): Polyline[] {
    const rv: Polyline[] = [];
    let cur: Point[] | null = null;
    let closed = false;
    let start: Point = { x: 0, y: 0 };
    let at: Point = { x: 0, y: 0 };

    const flush = () => {
        if (!cur) {
            return;
        }
        const pts = dedupe(cur, closed);
        if (pts.length) {
            rv.push({ pts, closed: closed && pts.length >= 3 });
        }
        cur = null;
        closed = false;
    };

    for (const seg of parsePathData(d)) {
        switch (seg.c) {
            case 'M':
                flush();
                cur = [{ ...seg.p }];
                start = at = seg.p;
                break;
            case 'L':
                cur = cur ?? [{ ...at }];
                cur.push({ ...seg.p });
                at = seg.p;
                break;
            case 'C':
                cur = cur ?? [{ ...at }];
                flattenCubic(at, seg.c1, seg.c2, seg.p, flat, cur, 0);
                at = seg.p;
                break;
            case 'Q': {
                const cubic = quadToCubic(at, seg.q, seg.p);
                cur = cur ?? [{ ...at }];
                flattenCubic(at, cubic[1], cubic[2], seg.p, flat, cur, 0);
                at = seg.p;
                break;
            }
            case 'A':
                cur = cur ?? [{ ...at }];
                for (const [p0, c1, c2, p1] of arcToCubics(at, seg.rx, seg.ry, seg.rot, seg.large, seg.sweep, seg.p)) {
                    flattenCubic(p0, c1, c2, p1, flat, cur, 0);
                }
                at = seg.p;
                break;
            case 'Z':
                closed = true;
                at = start;
                flush();
                break;
        }
    }
    flush();
    return rv.filter((poly) => poly.pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
}

/** Polylines of a path, flattened to `tol`. A closed subpath does not repeat its first point. */
export function flattenPathData(d: string, tol: number): { pts: Point[]; closed: boolean; }[] {
    return polylinesOf(d, { tol, maxTurn: Infinity, maxStep: Infinity });
}

/** A curve is split until it is within `tol` of its chord, turns less than `maxTurn`, and is no longer than `maxStep` */
type Flatness = { tol: number; maxTurn: number; maxStep: number; };

function flattenCubic(p0: Point, c1: Point, c2: Point, p3: Point, f: Flatness, out: Point[], depth: number): void {
    const flat = depth >= 18 || out.length > 20000 || (
        lineDist(c1, p0, p3) <= f.tol
        && lineDist(c2, p0, p3) <= f.tol
        && controlTurn(p0, c1, c2, p3) <= f.maxTurn
        && Math.hypot(c1.x - p0.x, c1.y - p0.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(p3.x - c2.x, p3.y - c2.y) <= f.maxStep
    );
    if (flat) {
        pushPt(out, p3);
        return;
    }
    const [a, b] = splitCubic([p0, c1, c2, p3], 0.5);
    flattenCubic(a[0], a[1], a[2], a[3], f, out, depth + 1);
    flattenCubic(b[0], b[1], b[2], b[3], f, out, depth + 1);
}

/** How far the control polygon turns, which bounds how far the curve turns */
function controlTurn(...pts: Point[]): number {
    let total = 0;
    let prev: Point | null = null;
    for (let i = 1; i < pts.length; i++) {
        const v = { x: pts[i].x - pts[i - 1].x, y: pts[i].y - pts[i - 1].y };
        if (Math.hypot(v.x, v.y) < 1e-12) {
            continue;
        }
        if (prev) {
            total += Math.abs(Math.atan2(prev.x * v.y - prev.y * v.x, prev.x * v.x + prev.y * v.y));
        }
        prev = v;
    }
    return total;
}

function lineDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) {
        return Math.hypot(p.x - a.x, p.y - a.y);
    }
    return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

function pushPt(out: Point[], p: Point): void {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-9) {
        out.push({ x: p.x, y: p.y });
    }
}

function dedupe(pts: readonly Point[], closed: boolean): Point[] {
    const out: Point[] = [];
    for (const p of pts) {
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(prev.x - p.x, prev.y - p.y) > 1e-9) {
            out.push({ x: p.x, y: p.y });
        }
    }
    if (closed && out.length > 1 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) <= 1e-9) {
        out.pop();
    }
    return out;
}
