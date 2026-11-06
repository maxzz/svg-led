import { atom } from "jotai";
import { type Point, type Rect } from "@/svg-core";
import { ROTATE_CURSOR_IMAGE_STEP, ROTATE_CURSOR_STEP } from "@/ui/cursors/8-rotate-glyph";

/**
 * The grips are 4px squares centered on the frame, so they stick out 2px.
 * Rotation begins just outside that and reaches a short distance further, but only near each grip:
 * inside the frame is a move, and the squares themselves stay resize.
 */
export const ROTATE_INNER_PX = 2;
export const ROTATE_OUTER_PX = 16;

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

/** Grip centers as fractions of the frame: four corners, then the four edge midpoints. */
const GRIP_FRACTIONS: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1], [0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]];

/** Rotation is offered only in squares of half-size ROTATE_OUTER_PX around each grip, never along the rest of an edge. */
function rotateZones(box: Rect): Rect[] {
    return GRIP_FRACTIONS.map(([fx, fy]) => ({
        x: box.x + fx * box.width - ROTATE_OUTER_PX,
        y: box.y + fy * box.height - ROTATE_OUTER_PX,
        width: 2 * ROTATE_OUTER_PX,
        height: 2 * ROTATE_OUTER_PX,
    }));
}

/** Screen point is near a grip, outside the frame and grips, so it rotates instead of moving or resizing. */
export function inRotateBand(box: Rect, p: Point): boolean {
    return !contains(expandedRect(box, ROTATE_INNER_PX), p) && rotateZones(box).some((zone) => contains(zone, p));
}

/**
 * Path for the rotate zones, with the rect that covers the frame and the grips cut out.
 * The pieces do not overlap each other, so the path is filled with the nonzero rule.
 * Coordinates are screen pixels, same space as the selection frame.
 */
export function rotateBandD(box: Rect): string {
    const inner = expandedRect(box, ROTATE_INNER_PX);
    return rotateZones(box).flatMap((zone) => rectMinus(zone, inner)).map(rectPath).join('');
}

/** `a` with `b` removed, as up to four rects. */
function rectMinus(a: Rect, b: Rect): Rect[] {
    const ix1 = Math.max(a.x, b.x);
    const iy1 = Math.max(a.y, b.y);
    const ix2 = Math.min(a.x + a.width, b.x + b.width);
    const iy2 = Math.min(a.y + a.height, b.y + b.height);
    if (ix1 >= ix2 || iy1 >= iy2) {
        return [a];
    }
    const out: Rect[] = [];
    if (iy1 > a.y) out.push({ x: a.x, y: a.y, width: a.width, height: iy1 - a.y });
    if (iy2 < a.y + a.height) out.push({ x: a.x, y: iy2, width: a.width, height: a.y + a.height - iy2 });
    if (ix1 > a.x) out.push({ x: a.x, y: iy1, width: ix1 - a.x, height: iy2 - iy1 });
    if (ix2 < a.x + a.width) out.push({ x: ix2, y: iy1, width: a.x + a.width - ix2, height: iy2 - iy1 });
    return out;
}

function rectPath(r: Rect): string {
    return `M${px(r.x)} ${px(r.y)}h${px(r.width)}v${px(r.height)}h${px(-r.width)}z`;
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
