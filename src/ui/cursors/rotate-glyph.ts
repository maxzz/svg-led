// Quarter-circle rotate cursor, a 1px line. Angle 0 bulges to the right (the pointer is to the
// right of the selection center); positive angles turn that bulge clockwise. The hotspot is the
// middle of the arc, on a pixel center so the 1px stroke covers one pixel there.

export const ROTATE_GLYPH = { size: 24, hotX: 12.5, hotY: 12.5 };

export const ROTATE_CURSOR_STEP = 15;

export const ROTATE_CURSOR_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_STEP }, (_, i) => i * ROTATE_CURSOR_STEP);

const HOT = ROTATE_GLYPH.hotX;
const R = 8;
const HALF = 45;
const HEAD = 3.2;
const SPREAD = 1.6;

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

/** Unrotated centerline: the arc, then an open arrowhead at each end. */
function rotateGlyphPath(): string {
    const cx = HOT - R;
    const cy = HOT;
    const start = polar(-HALF, R, cx, cy);
    const end = polar(HALF, R, cx, cy);
    const arc = `M${n(start[0])} ${n(start[1])}A${R} ${R} 0 0 1 ${n(end[0])} ${n(end[1])}`;
    const heads = [arrow(-HALF, -1, cx, cy), arrow(HALF, 1, cx, cy)]
        .map((pts) => `M${pts.map((p) => `${n(p[0])} ${n(p[1])}`).join('L')}`)
        .join('');
    return arc + heads;
}

/**
 * White halo, then the black line. The halo is a 3px stroke, so 1px of white shows around the 1px black stroke.
 */
export function rotateCursorMarkup(turnDeg: number): string {
    const { size, hotX, hotY } = ROTATE_GLYPH;
    const d = rotateGlyphPath();
    const spin = turnDeg ? ` transform="rotate(${turnDeg} ${hotX} ${hotY})"` : '';
    const stroke = `fill="none" stroke-linecap="round" stroke-linejoin="round"${spin}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${d}" ${stroke} stroke="#fff" stroke-width="3"/><path d="${d}" ${stroke} stroke="#000" stroke-width="1"/></svg>`;
}

/** `dir` +1 points clockwise along the arc, -1 the other way. The tip sits on the arc. */
function arrow(deg: number, dir: 1 | -1, cx: number, cy: number): [number, number][] {
    const tip = polar(deg, R, cx, cy);
    const a = (deg * Math.PI) / 180;
    const tx = -Math.sin(a) * dir;
    const ty = Math.cos(a) * dir;
    const px = -ty;
    const py = tx;
    const bx = tip[0] - tx * HEAD;
    const by = tip[1] - ty * HEAD;
    return [
        [bx + px * SPREAD, by + py * SPREAD],
        tip,
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
