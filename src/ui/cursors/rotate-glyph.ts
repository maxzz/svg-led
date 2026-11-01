// Quarter-circle rotate cursor, a 1px line. Angle 0 bulges to the right (the pointer is to the
// right of the selection center); positive angles turn that bulge clockwise. The hotspot is the
// middle of the arc, on a pixel center so the 1px stroke covers one pixel there.

export const ROTATE_GLYPH = { size: 24, hotX: 12.5, hotY: 12.5 };

export const ROTATE_CURSOR_STEP = 15;

export const ROTATE_CURSOR_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_STEP }, (_, i) => i * ROTATE_CURSOR_STEP);

const HOT = ROTATE_GLYPH.hotX;
const R = 8;
const HALF = 45;
/** Tip-to-base length of each arrowhead, along the arc's tangent. */
const HEAD = 3.8;
/** Half the width of the arrowhead base. Wide enough to read at cursor size, still smaller than the arc. */
const SPREAD = 2;
/** How far the tip sits past the end of the arc. */
const TIP_PAST = 1.8;

/** Centerline of the arc and both arrowheads at `turnDeg` clockwise. The stroke extends 1.5px past these points. */
export function rotateGlyphPoints(turnDeg: number): [number, number][] {
    const cx = HOT - R;
    const cy = HOT;
    const pts: [number, number][] = [
        ...arc(-HALF, HALF, R, cx, cy),
        ...arrow(-HALF, -1, cx, cy),
        ...arrow(HALF, 1, cx, cy),
    ];
    return turnDeg ? pts.map((p) => turn(p, turnDeg)) : pts;
}

/** Unrotated pieces: the 1px arc, and a filled triangle at each end. */
function glyphParts(): { arc: string; heads: string } {
    const cx = HOT - R;
    const cy = HOT;
    const start = polar(-HALF, R, cx, cy);
    const end = polar(HALF, R, cx, cy);
    const arc = `M${n(start[0])} ${n(start[1])}A${R} ${R} 0 0 1 ${n(end[0])} ${n(end[1])}`;
    const heads = [arrow(-HALF, -1, cx, cy), arrow(HALF, 1, cx, cy)]
        .map((pts) => `M${pts.map((p) => `${n(p[0])} ${n(p[1])}`).join('L')}Z`)
        .join('');
    return { arc, heads };
}

/**
 * White halo, then the black line and the arrowheads.
 * The arc is a 1px stroke (3px white underneath). Each head is a filled triangle with a 1px white edge.
 */
export function rotateCursorMarkup(turnDeg: number): string {
    const { size, hotX, hotY } = ROTATE_GLYPH;
    const { arc, heads } = glyphParts();
    const spin = turnDeg ? ` transform="rotate(${turnDeg} ${hotX} ${hotY})"` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${arc}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"${spin}/><path d="${heads}" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="miter"${spin}/><path d="${arc}" fill="none" stroke="#000" stroke-width="1" stroke-linecap="round"${spin}/><path d="${heads}" fill="#000"${spin}/></svg>`;
}

/** `dir` +1 points clockwise along the arc, -1 the other way. Returns tip, then the two base corners. */
function arrow(deg: number, dir: 1 | -1, cx: number, cy: number): [number, number][] {
    const end = polar(deg, R, cx, cy);
    const a = (deg * Math.PI) / 180;
    const tx = -Math.sin(a) * dir;
    const ty = Math.cos(a) * dir;
    const px = -ty;
    const py = tx;
    const tip: [number, number] = [end[0] + tx * TIP_PAST, end[1] + ty * TIP_PAST];
    const back = HEAD - TIP_PAST;
    const bx = end[0] - tx * back;
    const by = end[1] - ty * back;
    return [
        tip,
        [bx + px * SPREAD, by + py * SPREAD],
        [bx - px * SPREAD, by - py * SPREAD],
    ];
}

function polar(deg: number, r: number, cx: number, cy: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(a0: number, a1: number, r: number, cx: number, cy: number): [number, number][] {
    const span = a1 - a0;
    const steps = Math.max(2, Math.ceil(Math.abs(span) / 8));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
        pts.push(polar(a0 + (span * i) / steps, r, cx, cy));
    }
    return pts;
}

/** Clockwise, matching a positive pointer angle in screen space (y grows downward). */
function turn([x, y]: [number, number], deg: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - HOT;
    const dy = y - HOT;
    return [HOT + dx * c - dy * s, HOT + dx * s + dy * c];
}

function n(v: number): string {
    return (Math.round(v * 10) / 10).toFixed(1);
}
