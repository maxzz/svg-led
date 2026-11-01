// Angle step and hotspot for the rotate cursor.
// The drawing is the `rotateCursor` SVG in tailwind-cursors.ts.
// Angle 0 bulges to the right; positive angles turn that bulge clockwise around the hotspot.

export const ROTATE_GLYPH = { size: 24, hotX: 12, hotY: 12 };

export const ROTATE_CURSOR_STEP = 15;

export const ROTATE_CURSOR_DEGREES = Array.from({ length: 360 / ROTATE_CURSOR_STEP }, (_, i) => i * ROTATE_CURSOR_STEP);
