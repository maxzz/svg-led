// Angle step and hotspot for the rotate cursor.
// The drawing is the `rotateCursor` SVG in 1-2-cursor-rotate.ts.
// Angle 0 bulges to the right; positive angles turn that bulge clockwise around the hotspot.

export const ROTATE_GLYPH = { size: 24, hotX: 12, hotY: 12 };

/** Rotation snaps to multiples of this many degrees. */
export const ROTATE_CURSOR_STEP = 15;

/** Eight cursor images, one every 45°: four corners and four edges. The pointer picks the nearest one. */
export const ROTATE_CURSOR_IMAGE_STEP = 45;

export const ROTATE_CURSOR_IMAGE_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_IMAGE_STEP }, (_, i) => i * ROTATE_CURSOR_IMAGE_STEP);
