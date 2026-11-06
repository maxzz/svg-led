import { atom } from "jotai";
import { type Point, type Rect } from "@/svg-core";
import { ROTATE_CURSOR_STEP } from "@/ui/cursors/8-rotate-glyph";

/**
 * The grips are 4px squares centered on the frame, so they stick out 2px.
 * Rotation begins just outside that and reaches a short distance further:
 * inside the frame is a move, and the squares themselves stay resize.
 */
export const ROTATE_INNER_PX = 2;
export const ROTATE_OUTER_PX = 16;

export const ROTATE_SNAP_DEG = 15;

/** Tooltip sits this far from the pointer, in screen pixels. */
export const ROTATE_TOOLTIP_GAP = 16;

export type RotateReadout = { x: number; y: number; label: string };

/**
 * Which rotate bitmap to show (`cursor-rotate-0` … `cursor-rotate-345`) over the band and for the whole drag.
 * Resolved to an image when the canvas paints it; every 15° step exists, including the corners.
 */
export const rotateCursorAtom = atom<string | null>(null);

/** Degree label that follows the pointer while a rotation drag is active. */
export const rotateReadoutAtom = atom<RotateReadout | null>(null);

/** Corner and edge grips hide for the duration of a resize or a rotation. */
export const selectionGripsHiddenAtom = atom(false);

//---------------------------------------------------------------------------

/** Screen point lies outside the grips and within the rotate reach around the selection frame. */
export function inRotateBand(box: Rect, p: Point): boolean {
    return contains(expandedRect(box, ROTATE_OUTER_PX), p) && !contains(expandedRect(box, ROTATE_INNER_PX), p);
}

/**
 * Even-odd ring: the outer rect minus the rect that covers the frame and the grips.
 * Coordinates are screen pixels, same space as the selection frame.
 */
export function rotateBandD(box: Rect): string {
    const o = expandedRect(box, ROTATE_OUTER_PX);
    const i = expandedRect(box, ROTATE_INNER_PX);
    return `M${px(o.x)} ${px(o.y)}h${px(o.width)}v${px(o.height)}h${px(-o.width)}zM${px(i.x)} ${px(i.y)}h${px(i.width)}v${px(i.height)}h${px(-i.width)}z`;
}

export function expandedRect(box: Rect, pad: number): Rect {
    return { x: box.x - pad, y: box.y - pad, width: box.width + 2 * pad, height: box.height + 2 * pad };
}

/** Cursor whose bulge points from `center` toward `pointer`, in 15° steps. */
export function rotateCursorClass(center: Point, pointer: Point): string {
    const deg = Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180 / Math.PI;
    const turns = 360 / ROTATE_CURSOR_STEP;
    const index = mod(Math.round(deg / ROTATE_CURSOR_STEP), turns);
    return `cursor-rotate-${index * ROTATE_CURSOR_STEP}`;
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
