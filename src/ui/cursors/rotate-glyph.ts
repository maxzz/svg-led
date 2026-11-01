// Quarter-circle rotate cursor. Angle 0 bulges to the right (the pointer is to the right of the
// selection center); positive angles turn that bulge clockwise. The hotspot is the middle of the arc.

export const ROTATE_GLYPH = { size: 32, hotX: 16, hotY: 16 };

export const ROTATE_CURSOR_STEP = 15;

export const ROTATE_CURSOR_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_STEP }, (_, i) => i * ROTATE_CURSOR_STEP);

const HOT = ROTATE_GLYPH.hotX;
const RMID = 8.6;
const INNER = 6.15;
const OUTER = 11.05;
const WING_INNER = 4.15;
const WING_OUTER = 13.05;
const TIP = 5.4;
const HALF = 45;

/** Outline of the cursor at `turnDeg` clockwise, hotspot at the center of the bitmap. */
export function rotateGlyphPoints(turnDeg: number): [number, number][] {
    const cx = HOT - RMID;
    const cy = HOT;
    const pts: [number, number][] = [
        ...arc(-HALF, HALF, OUTER, cx, cy),
        polar(HALF, WING_OUTER, cx, cy),
        arrowTip(HALF, 1, cx, cy),
        polar(HALF, WING_INNER, cx, cy),
        ...arc(HALF, -HALF, INNER, cx, cy),
        polar(-HALF, WING_INNER, cx, cy),
        arrowTip(-HALF, -1, cx, cy),
        polar(-HALF, WING_OUTER, cx, cy),
    ];
    return turnDeg ? pts.map((p) => turn(p, turnDeg)) : pts;
}

export function rotateGlyphPath(turnDeg: number): string {
    const pts = rotateGlyphPoints(turnDeg);
    return `${pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join('')}Z`;
}

/** White border, then the black arrow. The border is a 2px stroke, so 1px of white shows around the fill. */
export function rotateCursorMarkup(turnDeg: number): string {
    const { size } = ROTATE_GLYPH;
    const d = rotateGlyphPath(turnDeg);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${d}" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="${d}" fill="#000"/></svg>`;
}

function arrowTip(deg: number, dir: 1 | -1, cx: number, cy: number): [number, number] {
    const [x, y] = polar(deg, RMID, cx, cy);
    const a = (deg * Math.PI) / 180;
    return [x - Math.sin(a) * dir * TIP, y + Math.cos(a) * dir * TIP];
}

function polar(deg: number, r: number, cx: number, cy: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(a0: number, a1: number, r: number, cx: number, cy: number): [number, number][] {
    const span = a1 - a0;
    const steps = Math.max(2, Math.ceil(Math.abs(span) / 5));
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
