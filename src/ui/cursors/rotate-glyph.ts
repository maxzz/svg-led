// Quarter-circle rotate cursor, a 1px line with a filled arrowhead at each end.
// Angle 0 bulges to the right (the pointer is to the right of the selection center); positive angles
// turn that bulge clockwise. The hotspot is the middle of the arc.
//
// The arrowheads share one straight vertical back, through the arc's center (the inner guide).
// Nothing extends past the bulge (the outer guide).

export const ROTATE_GLYPH = { size: 32, hotX: 16.5, hotY: 16.5 };

export const ROTATE_CURSOR_STEP = 15;

export const ROTATE_CURSOR_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_STEP }, (_, i) => i * ROTATE_CURSOR_STEP);

const HOT = ROTATE_GLYPH.hotX;
const R = 8;
const HALF = 45;
/** How far each arrow tip sits from the arc center, along the straight back, in multiples of R. */
const BACK_OUTER = 1.33;

/** Centerline of the arc and the corners of both arrowheads at `turnDeg` clockwise. The stroke extends 1.5px past these points. */
export function rotateGlyphPoints(turnDeg: number): [number, number][] {
    const cx = HOT - R;
    const cy = HOT;
    const pts: [number, number][] = [
        ...arc(-HALF, HALF, R, cx, cy),
        ...arrow(-1, cx, cy),
        ...arrow(1, cx, cy),
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
    const heads = [arrow(-1, cx, cy), arrow(1, cx, cy)]
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

/**
 * `dir` -1 is the upper end, +1 the lower end (y grows downward).
 * The tip and the inner corner lie on the straight vertical back; the third corner is the arc end,
 * so the back of both arrows is one straight line and the arc stops at the outer bulge.
 */
function arrow(dir: 1 | -1, cx: number, cy: number): [number, number][] {
    const end = polar(dir * HALF, R, cx, cy);
    return [
        [cx, cy + dir * BACK_OUTER * R],
        [cx, end[1]],
        end,
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
