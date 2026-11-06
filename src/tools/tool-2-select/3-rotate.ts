import { atom } from "jotai";
import { type Point, type Rect } from "@/svg-core";
import { ROTATE_CURSOR_IMAGE_STEP, ROTATE_CURSOR_STEP } from "@/ui/cursors/8-rotate-glyph";

/**
 * The grips are 4px squares centered on the frame, so they stick out 2px.
 * Rotation begins just outside that and reaches a short distance further, but only near each grip:
 * inside the frame is a move, and the squares themselves stay resize.
 */
export const ROTATE_INNER_PX = 2;

/** Gap between the outer edge of a grip (its corner, on a corner grip) and the near side of the rotate zone. */
export const ROTATE_GAP_PX = 1;

/** The rotate zone is a 2×2 px square on the grip's line: 2px long along the line, 1px to each side of it. */
export const ROTATE_ZONE_PX = 2;

export const ROTATE_SNAP_DEG = 15;

/** Tooltip sits this far from the pointer, in screen pixels. */
export const ROTATE_TOOLTIP_GAP = 16;

export type RotateReadout = { x: number; y: number; label: string };

/**
 * Which rotate cursor class to show (`cursor-rotate-0` … `cursor-rotate-315`) over the band and for the whole drag.
 * Each class is a 45° image defined in the Tailwind cursors plugin.
 */
export const rotateCursorAtom = atom<string | null>(null);

/** Degree label that follows the pointer while a rotation drag is active. */
export const rotateReadoutAtom = atom<RotateReadout | null>(null);

/** Corner and edge grips hide for the duration of a resize or a rotation. */
export const selectionGripsHiddenAtom = atom(false);

//---------------------------------------------------------------------------

/** Half of the 2px width of the rotate zone: the zone reaches 1px to each side of the grip's line. */
const ROTATE_ZONE_HALF_PX = ROTATE_ZONE_PX / 2;

/**
 * Each grip with the direction of its rotate line, pointing outward from the frame: the edge normal for the
 * edge midpoints, the diagonal for the corners. `fx`, `fy` place the grip on the frame (0 to 1).
 */
const GRIPS: { fx: number; fy: number; dx: number; dy: number; }[] = [
    { fx: 0, fy: 0, dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 }, // nw
    { fx: 0.5, fy: 0, dx: 0, dy: -1 }, // n
    { fx: 1, fy: 0, dx: Math.SQRT1_2, dy: -Math.SQRT1_2 }, // ne
    { fx: 1, fy: 0.5, dx: 1, dy: 0 }, // e
    { fx: 1, fy: 1, dx: Math.SQRT1_2, dy: Math.SQRT1_2 }, // se
    { fx: 0.5, fy: 1, dx: 0, dy: 1 }, // s
    { fx: 0, fy: 1, dx: -Math.SQRT1_2, dy: Math.SQRT1_2 }, // sw
    { fx: 0, fy: 0.5, dx: -1, dy: 0 }, // w
];

/** One rotate zone: a square on the line from the grip center along (dx, dy), from `start` to `end` along the line. */
type RotateLine = { cx: number; cy: number; dx: number; dy: number; start: number; end: number; };

function rotateLines(box: Rect): RotateLine[] {
    return GRIPS.map(({ fx, fy, dx, dy }) => {
        // how far the grip reaches along the line: its half-size along each axis the line moves on
        const gripReach = ROTATE_INNER_PX * (Math.abs(dx) + Math.abs(dy));
        const start = gripReach + ROTATE_GAP_PX;
        return { cx: box.x + fx * box.width, cy: box.y + fy * box.height, dx, dy, start, end: start + ROTATE_ZONE_PX };
    });
}

/** Point lies in the zone: along the line between `start` and `end`, and within 1px of the line on either side. */
function onRotateLine(line: RotateLine, p: Point): boolean {
    const ox = p.x - line.cx;
    const oy = p.y - line.cy;
    const along = ox * line.dx + oy * line.dy;
    const across = -ox * line.dy + oy * line.dx;
    return along >= line.start && along <= line.end && Math.abs(across) <= ROTATE_ZONE_HALF_PX;
}

/** Screen point is in a rotate zone (outside the frame and grips, on a grip's line). Rotation starts there instead of moving or resizing. */
export function inRotateBand(box: Rect, p: Point): boolean {
    return !contains(expandedRect(box, ROTATE_INNER_PX), p) && rotateLines(box).some((line) => onRotateLine(line, p));
}

/**
 * Path for the rotate zones, one 2×2 px square per grip. Every square is built the same way, so they all
 * have the same winding and the nonzero rule fills their union.
 * Coordinates are screen pixels, same space as the selection frame.
 */
export function rotateBandD(box: Rect): string {
    return rotateLines(box).map(rotateLinePath).join('');
}

function rotateLinePath(line: RotateLine): string {
    const nx = -line.dy;
    const ny = line.dx;
    const at = (along: number, across: number) => `${px(line.cx + along * line.dx + across * nx)} ${px(line.cy + along * line.dy + across * ny)}`;
    const h = ROTATE_ZONE_HALF_PX;
    return `M${at(line.start, -h)}L${at(line.end, -h)}L${at(line.end, h)}L${at(line.start, h)}Z`;
}

export function expandedRect(box: Rect, pad: number): Rect {
    return { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
}

/**
 * Cursor whose bulge points from `center` toward `pointer`. The angle is snapped to 15° steps first,
 * then the nearest of the eight 45° images is used.
 */
export function rotateCursorClass(center: Point, pointer: Point): string {
    const deg = Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180 / Math.PI;
    const snapped = Math.round(deg / ROTATE_CURSOR_STEP) * ROTATE_CURSOR_STEP;
    const turns = 360 / ROTATE_CURSOR_IMAGE_STEP;
    const index = mod(Math.round(snapped / ROTATE_CURSOR_IMAGE_STEP), turns);
    return `cursor-rotate-${index * ROTATE_CURSOR_IMAGE_STEP}`;
}

//---------------------------------------------------------------------------

/** Continuous radians from `start` to `current`, staying near the previous sample so a full turn does not flip. */
export function unwrapAngle(start: number, current: number, previous: number): number {
    return previous + Math.atan2(Math.sin(current - start - previous), Math.cos(current - start - previous));
}

/** While `snap` is set, the angle jumps to the nearest multiple of 15°. */
export function snapRotation(degrees: number, snap: boolean): number {
    if (!snap) {
        return degrees;
    }
    const steps = Math.round(Math.abs(degrees) / ROTATE_SNAP_DEG);
    const signed = (degrees < 0 ? -1 : 1) * steps * ROTATE_SNAP_DEG;
    return signed === 0 ? 0 : signed;
}

/** Free rotation keeps two decimals ("3.44°"); a snapped angle is a whole number ("15°"). */
export function formatRotation(degrees: number, snap: boolean): string {
    if (snap) {
        const n = Math.round(degrees);
        return `${n === 0 ? 0 : n}°`;
    }
    let text = (Math.round(degrees * 100) / 100).toFixed(2);
    if (text === '-0.00') {
        text = '0.00';
    }
    return `${text}°`;
}

//---------------------------------------------------------------------------

function contains(r: Rect, p: Point): boolean {
    return p.x >= r.x && p.y >= r.y && p.x <= r.x + r.width && p.y <= r.y + r.height;
}

function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

function px(v: number): string {
    return String(Math.round(v * 100) / 100);
}
