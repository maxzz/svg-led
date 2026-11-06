import type { PluginAPI } from 'tailwindcss/plugin';
import { ROTATE_CURSOR_DEGREES, ROTATE_GLYPH } from './rotate-glyph';

// Cursor artwork is plain SVG markup, kept literal so it can be edited in an external editor and pasted back.
// Drawn on a 24x24 grid (one unit = one CSS pixel).
// Rules: every black shape has a white border at least 1px wide, and every line or dot is at least 1px thick.
// Lines are centered on pixel centers (x.5) so a 1px stroke covers exactly one pixel.

function svgToDataUri(svg: string): string {
    // HTML comments are for maintainers only; strip them so they are not exported with the cursor
    const markup = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
    return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

/** Hotspot defaults to the selection-arrow tip at (1, 1). Resize cursors pass the center of the glyph. */
function cursorCss(svg: string, hotX = 1, hotY = 1): string {
    return `url("${svgToDataUri(svg)}") ${hotX} ${hotY}, default`;
}

//---------------------------------------------------------------------------

/** Empty canvas, nothing selected: just the arrow */
const selectionPointer = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- white 1px border: a 2px stroke, half of it covered by the black fill -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <!-- solid arrow -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
    </svg>
`;

//---------------------------------------------------------------------------

/** Pointer over an object that is not selected yet: arrow plus a small square at its lower right*/
const selectionPointerHover = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- arrow, with its white border -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
        <!-- square: white 1px border, then the black square -->
        <rect x="12" y="14" width="8" height="8" fill="#fff"/>
        <rect x="13" y="15" width="6" height="6" fill="#000"/>
    </svg>
`;

//---------------------------------------------------------------------------

/** One or more objects selected: arrow plus a four-way move icon at its lower right */
const selectionMove = `
<svg id="renders" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <defs>
    <style>
      .cls-1 {
        stroke: #000;
      }

      .cls-1, .cls-2 {
        fill: none;
      }

      .cls-2 {
        stroke-width: 3px;
      }

      .cls-2, .cls-3 {
        stroke: #fff;
      }

      .cls-3 {
        fill: #fff;
        stroke-linejoin: round;
        stroke-width: 2px;
      }

      .cls-4 {
        fill: #b2f2bb;
      }
    </style>
  </defs>
  <g>
    <path class="cls-3" d="M1,1v13.65l.84-.07,3.65-4.01,4.91.02-.16-.5L1.42,1.16l-.42-.16Z"/>
    <path d="M1,1v13.65l.84-.07,3.65-4.01,4.91.02-.16-.5L1.42,1.16l-.42-.16Z"/>
  </g>
  <g id="dross_white" data-name="dross white">
    <polygon class="cls-3" points="16.5 10.5 14 13 19 13 16.5 10.5"/>
    <polygon class="cls-3" points="16.5 22.5 14 20 19 20 16.5 22.5"/>
    <polygon class="cls-3" points="10.5 16.5 12.99 14 12.99 19 10.5 16.5"/>
    <polygon class="cls-3" points="22.5 16.5 20 14 20 19 22.5 16.5"/>
  </g>
  <path class="cls-2" d="M16.5,14v5M14,16.5h5"/>
  <g id="cross_black" data-name="cross black">
    <polygon points="16.5 10.5 14 13 19 13 16.5 10.5"/>
    <polygon points="16.5 22.5 14 20 19 20 16.5 22.5"/>
    <polygon points="10.5 16.5 12.99 14 12.99 19 10.5 16.5"/>
    <polygon points="22.5 16.5 20 14 20 19 22.5 16.5"/>
  </g>
  <path class="cls-1" d="M16.5,12v9M12,16.5h9"/>
</svg>`;

//---------------------------------------------------------------------------

/**
 * Horizontal resize. Double arrow centered on the 24×24 grid; the hotspot is that center.
 * White shape is the black arrow with a 2px stroke, so 1px of white shows around it.
 */
const resizeHorizontal = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="2,12 7,8 7,11 17,11 17,8 22,12 17,16 17,13 7,13 7,16" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="2,12 7,8 7,11 17,11 17,8 22,12 17,16 17,13 7,13 7,16" fill="#000"/>
    </svg>
`;

/** Vertical resize. Same arrow as the horizontal one, turned on its center. */
const resizeVertical = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 16,7 13,7 13,17 16,17 12,22 8,17 11,17 11,7 8,7" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="12,2 16,7 13,7 13,17 16,17 12,22 8,17 11,17 11,7 8,7" fill="#000"/>
    </svg>
`;

/** Northwest–southeast resize. The horizontal arrow rotated 45° around the center. Shared by the nw and se corners. */
const resizeNwSe = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="4.9,4.9 11.3,5.6 9.2,7.8 16.2,14.8 18.4,12.7 19.1,19.1 12.7,18.4 14.8,16.2 7.8,9.2 5.6,11.3" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="4.9,4.9 11.3,5.6 9.2,7.8 16.2,14.8 18.4,12.7 19.1,19.1 12.7,18.4 14.8,16.2 7.8,9.2 5.6,11.3" fill="#000"/>
    </svg>
`;

/** Northeast–southwest resize. The horizontal arrow rotated the other way. Shared by the ne and sw corners. */
const resizeNeSw = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="4.9,19.1 5.6,12.7 7.8,14.8 14.8,7.8 12.7,5.6 19.1,4.9 18.4,11.3 16.2,9.2 9.2,16.2 11.3,18.4" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="4.9,19.1 5.6,12.7 7.8,14.8 14.8,7.8 12.7,5.6 19.1,4.9 18.4,11.3 16.2,9.2 9.2,16.2 11.3,18.4" fill="#000"/>
    </svg>
`;

//---------------------------------------------------------------------------

/**
 * Rotate cursor at 0°: a quarter-circle bulging right, with an arrowhead at each end.
 * The other angles are this same drawing turned around the hotspot (12, 12), the center of the 24×24 grid.
 * Edit the points here. Each arrow is three corners — outer tip, inner corner on the
 * vertical back, and the corner that meets the arc. The white shape is the black one
 * with a stroke, so 1px of white shows around it.
 */
const rotateCursor = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
    <path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" d="M7.275 4.725 C11.5785 6.7935 12.06525 10.39275 12.06525 12 C12.06525 13.60725 11.59275 17.6145 7.275 19.275"/>
    <polygon points="9.975,20.25 6.3,20.25 6.3,15.975" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="miter"/>
    <polygon points="9.975,20.25 6.3,20.25 6.3,15.975" fill="#000"/>
    <polygon points="9.975,3.75 6.3,3.75 6.3,8.025" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="miter"/>
    <polygon points="9.975,3.75 6.3,3.75 6.3,8.025" fill="#000"/>
    <path fill="none" stroke="#000" stroke-width="1" stroke-linecap="round" d="M7.275 4.725 C11.5785 6.7935 12.06525 10.39275 12.06525 12 C12.06525 13.60725 11.59275 17.6145 7.275 19.275"/>
</svg>
`;

//---------------------------------------------------------------------------

/** Same drawing, turned clockwise around the hotspot. Angle 0 is the constant above. */
function rotateCursorAt(deg: number): string {
    if (!deg) {
        return rotateCursor;
    }
    const { hotX, hotY } = ROTATE_GLYPH;
    const withGroup = rotateCursor.replace(
        /<svg\b([^>]*)>/,
        `<svg$1><g transform="rotate(${deg} ${hotX} ${hotY})">`,
    );
    const end = withGroup.lastIndexOf('</svg>');
    return `${withGroup.slice(0, end)}</g></svg>`;
}

/**
 * Bitmap for a rotate-cursor class (`cursor-rotate-45`, …).
 * The angle is chosen while the pointer moves, so this is a CSS cursor value rather than a Tailwind
 * class: Tailwind only emits class names written out in source, and the corner angles never were.
 */
const rotateCursorStyles = new Map(ROTATE_CURSOR_DEGREES.map((deg) => [
    `cursor-rotate-${deg}`,
    cursorCss(rotateCursorAt(deg), ROTATE_GLYPH.hotX, ROTATE_GLYPH.hotY),
]));

export function rotateCursorStyle(className: string): string {
    return rotateCursorStyles.get(className) ?? 'default';
}

//---------------------------------------------------------------------------

/**
 * Pen: a nib pointing to the upper left; the hotspot is the tip at (2, 2).
 * Drawn upright with the tip at the origin, then turned so the nib leans like a pen held in the right hand.
 * `{badge}` is replaced by the action badge at the lower right (or nothing for the plain pen).
 */
const penCursor = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <g transform="translate(2 2) rotate(-45)">
            <!-- white 1px border around the nib and the collar -->
            <path d="M0 0L4 8L3 11H-3L-4 8Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
            <rect x="-3.5" y="12" width="7" height="4" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
            <!-- black nib and collar, with the slit and the breather hole cut out in white -->
            <path d="M0 0L4 8L3 11H-3L-4 8Z" fill="#000"/>
            <rect x="-3.5" y="12" width="7" height="4" fill="#000"/>
            <path d="M0 1V6" stroke="#fff" stroke-width="1"/>
            <circle cx="0" cy="7" r="1.2" fill="#fff"/>
        </g>
        {badge}
    </svg>
`;

/** Badges centered on (19.5, 19.5): a 3px white stroke under a 1px black one, so every black line has a white border */
const PEN_BADGES = {
    add: `
        <path d="M19.5 15V24M15 19.5H24" stroke="#fff" stroke-width="3"/>
        <path d="M19.5 16V23M16 19.5H23" stroke="#000" stroke-width="1"/>
    `,
    delete: `
        <path d="M15 19.5H24" stroke="#fff" stroke-width="3"/>
        <path d="M16 19.5H23" stroke="#000" stroke-width="1"/>
    `,
    // continue an open path from this end point
    continue: `
        <path d="M16 23L23 16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <path d="M16 23L23 16" stroke="#000" stroke-width="1" stroke-linecap="round"/>
    `,
    // convert the anchor: toggle corner and smooth, or pull out handles (Illustrator's caret)
    convert: `
        <path d="M16 22.5L19.5 16.5L23 22.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 22.5L19.5 16.5L23 22.5" fill="none" stroke="#000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    `,
    // close the path on its first point
    close: `
        <circle cx="19.5" cy="19.5" r="2.5" fill="none" stroke="#fff" stroke-width="3"/>
        <circle cx="19.5" cy="19.5" r="2.5" fill="none" stroke="#000" stroke-width="1"/>
    `,
};

function penCursorCss(badge?: keyof typeof PEN_BADGES): string {
    return cursorCss(penCursor.replace('{badge}', badge ? PEN_BADGES[badge] : ''), 2, 2);
}

//---------------------------------------------------------------------------

/**
 * Direct selection: the same arrow as the Selection tool, filled white with a 1px black edge,
 * so the two tools stay distinct. `{extra}` is the mark at the lower right (or nothing).
 */
const directCursor = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- white 1px outside the black edge: a 3px white stroke, then a 1px black stroke over a white fill -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#000" stroke-width="1" stroke-linejoin="round"/>
        {extra}
    </svg>
`;

/** Over an object that is not selected yet: the white arrow plus a small square */
const directHoverMark = `
    <rect x="12" y="14" width="8" height="8" fill="#fff"/>
    <rect x="13" y="15" width="6" height="6" fill="#000"/>
`;

/** Over a path point: the white arrow plus a small unfilled square at its lower right (white 1px border, black 1px edge) */
const directPointMark = `
    <rect x="13.5" y="15.5" width="5" height="5" fill="none" stroke="#fff" stroke-width="3"/>
    <rect x="13.5" y="15.5" width="5" height="5" fill="none" stroke="#000" stroke-width="1"/>
`;

/** Over a selected object, point, or handle: the white arrow plus the four-way move icon */
// const directMoveMark = `
//     <polygon points="16.5 10.5 14 13 19 13 16.5 10.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
//     <polygon points="16.5 22.5 14 20 19 20 16.5 22.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
//     <polygon points="10.5 16.5 12.99 14 12.99 19 10.5 16.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
//     <polygon points="22.5 16.5 20 14 20 19 22.5 16.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
//     <path d="M16.5 14V19M14 16.5H19" fill="none" stroke="#fff" stroke-width="3"/>
//     <polygon points="16.5 10.5 14 13 19 13 16.5 10.5" fill="#000"/>
//     <polygon points="16.5 22.5 14 20 19 20 16.5 22.5" fill="#000"/>
//     <polygon points="10.5 16.5 12.99 14 12.99 19 10.5 16.5" fill="#000"/>
//     <polygon points="22.5 16.5 20 14 20 19 22.5 16.5" fill="#000"/>
//     <path d="M16.5 12V21M12 16.5H21" fill="none" stroke="#000" stroke-width="1"/>
// `;
const directMoveMark = `
    <defs><style>
      .cls-21 {
        fill: #fff;
      }

      .cls-22 {
        fill: none;
        stroke: #fff;
        stroke-width: 1.25px;
        stroke-miterlimit: 10;
      }
    </style></defs>

    <g>
        <path class="cls-22" d="M17.52 15.35 C17.69 15.35 17.83 15.21 17.83 15.04 L17.83 12.81 C17.83 12.63 17.69 12.5 17.52 12.5 L15.28 12.5 C15.11 12.5 14.97 12.63 14.97 12.81 L14.97 13.78 L13.59 13.78 L13.59 12.81 C13.59 12.63 13.45 12.5 13.28 12.5 L11.05 12.5 C10.87 12.5 10.74 12.63 10.74 12.81 L10.74 13.78 L9.36 13.78 L9.36 12.81 C9.36 12.63 9.22 12.5 9.05 12.5 L6.81 12.5 C6.64 12.5 6.5 12.63 6.5 12.81 L6.5 15.04 C6.5 15.21 6.64 15.35 6.81 15.35 L7.73 15.35 L7.73 16.05 L6.81 16.05 C6.64 16.05 6.5 16.19 6.5 16.36 L6.5 18.6 C6.5 18.77 6.64 18.91 6.81 18.91 L7.73 18.91 L7.73 19.61 L6.81 19.61 C6.64 19.61 6.5 19.75 6.5 19.92 L6.5 22.15 C6.5 22.33 6.64 22.46 6.81 22.46 L9.05 22.46 C9.22 22.46 9.36 22.33 9.36 22.15 L9.36 21.18 L10.74 21.18 L10.74 22.15 C10.74 22.33 10.87 22.46 11.05 22.46 L13.28 22.46 C13.45 22.46 13.59 22.33 13.59 22.15 L13.59 21.18 L14.97 21.18 L14.97 22.15 C14.97 22.33 15.11 22.46 15.28 22.46 L17.52 22.46 C17.69 22.46 17.83 22.33 17.83 22.15 L17.83 19.92 C17.83 19.75 17.69 19.61 17.52 19.61 L16.64 19.61 L16.64 18.91 L17.52 18.91 C17.69 18.91 17.83 18.77 17.83 18.6 L17.83 16.36 C17.83 16.19 17.69 16.05 17.52 16.05 L16.64 16.05 L16.64 15.35 L17.52 15.35 Z"/>
        <path class="cls-21" d="M13.28 16.06 L11.05 16.06 C10.87 16.06 10.74 16.19 10.74 16.37 L10.74 18.6 C10.74 18.77 10.87 18.91 11.05 18.91 L13.28 18.91 C13.45 18.91 13.59 18.77 13.59 18.6 L13.59 16.37 C13.59 16.19 13.45 16.06 13.28 16.06 Z M13.36 18.42 C13.36 18.56 13.24 18.68 13.1 18.68 L11.23 18.68 C11.08 18.68 10.97 18.56 10.97 18.42 L10.97 16.55 C10.97 16.4 11.08 16.29 11.23 16.29 L13.1 16.29 C13.24 16.29 13.36 16.4 13.36 16.55 L13.36 18.42 Z"/>
        <path d="M13.1 16.29 L11.23 16.29 C11.08 16.29 10.97 16.4 10.97 16.55 L10.97 18.42 C10.97 18.56 11.08 18.68 11.23 18.68 L13.1 18.68 C13.24 18.68 13.36 18.56 13.36 18.42 L13.36 16.55 C13.36 16.4 13.24 16.29 13.1 16.29 Z M13.17 18.27 C13.17 18.39 13.07 18.49 12.95 18.49 L11.38 18.49 C11.25 18.49 11.16 18.39 11.16 18.27 L11.16 16.7 C11.16 16.57 11.25 16.48 11.38 16.48 L12.95 16.48 C13.07 16.48 13.17 16.57 13.17 16.7 L13.17 18.27 Z"/>
        <path class="cls-21" d="M17.52 15.35 C17.69 15.35 17.83 15.21 17.83 15.04 L17.83 12.81 C17.83 12.63 17.69 12.5 17.52 12.5 L15.28 12.5 C15.11 12.5 14.97 12.63 14.97 12.81 L14.97 13.78 L13.59 13.78 L13.59 12.81 C13.59 12.63 13.45 12.5 13.28 12.5 L11.05 12.5 C10.87 12.5 10.74 12.63 10.74 12.81 L10.74 13.78 L9.36 13.78 L9.36 12.81 C9.36 12.63 9.22 12.5 9.05 12.5 L6.81 12.5 C6.64 12.5 6.5 12.63 6.5 12.81 L6.5 15.04 C6.5 15.21 6.64 15.35 6.81 15.35 L7.73 15.35 L7.73 16.05 L6.81 16.05 C6.64 16.05 6.5 16.19 6.5 16.36 L6.5 18.6 C6.5 18.77 6.64 18.91 6.81 18.91 L7.73 18.91 L7.73 19.61 L6.81 19.61 C6.64 19.61 6.5 19.75 6.5 19.92 L6.5 22.15 C6.5 22.33 6.64 22.46 6.81 22.46 L9.05 22.46 C9.22 22.46 9.36 22.33 9.36 22.15 L9.36 21.18 L10.74 21.18 L10.74 22.15 C10.74 22.33 10.87 22.46 11.05 22.46 L13.28 22.46 C13.45 22.46 13.59 22.33 13.59 22.15 L13.59 21.18 L14.97 21.18 L14.97 22.15 C14.97 22.33 15.11 22.46 15.28 22.46 L17.52 22.46 C17.69 22.46 17.83 22.33 17.83 22.15 L17.83 19.92 C17.83 19.75 17.69 19.61 17.52 19.61 L16.64 19.61 L16.64 18.91 L17.52 18.91 C17.69 18.91 17.83 18.77 17.83 18.6 L17.83 16.36 C17.83 16.19 17.69 16.05 17.52 16.05 L16.64 16.05 L16.64 15.35 L17.52 15.35 Z M17.08 16.49 C17.25 16.49 17.39 16.63 17.39 16.81 L17.39 18.16 C17.39 18.33 17.25 18.47 17.08 18.47 L16.22 18.47 L16.22 20.05 L17.08 20.05 C17.25 20.05 17.39 20.19 17.39 20.36 L17.39 21.71 C17.39 21.88 17.25 22.02 17.08 22.02 L15.73 22.02 C15.56 22.02 15.42 21.88 15.42 21.71 L15.42 20.79 L13.18 20.79 L13.18 21.71 C13.18 21.88 13.04 22.02 12.87 22.02 L11.52 22.02 C11.35 22.02 11.21 21.88 11.21 21.71 L11.21 20.79 L8.91 20.79 L8.91 21.71 C8.91 21.88 8.77 22.02 8.6 22.02 L7.25 22.02 C7.08 22.02 6.94 21.88 6.94 21.71 L6.94 20.36 C6.94 20.19 7.08 20.05 7.25 20.05 L8.15 20.05 L8.15 18.47 L7.25 18.47 C7.08 18.47 6.94 18.33 6.94 18.16 L6.94 16.81 C6.94 16.63 7.08 16.49 7.25 16.49 L8.15 16.49 L8.15 14.91 L7.25 14.91 C7.08 14.91 6.94 14.77 6.94 14.6 L6.94 13.25 C6.94 13.08 7.08 12.94 7.25 12.94 L8.6 12.94 C8.77 12.94 8.91 13.08 8.91 13.25 L8.91 14.16 L11.21 14.16 L11.21 13.25 C11.21 13.08 11.35 12.94 11.52 12.94 L12.87 12.94 C13.04 12.94 13.18 13.08 13.18 13.25 L13.18 14.16 L15.42 14.16 L15.42 13.25 C15.42 13.08 15.56 12.94 15.73 12.94 L17.08 12.94 C17.25 12.94 17.39 13.08 17.39 13.25 L17.39 14.6 C17.39 14.77 17.25 14.91 17.08 14.91 L16.22 14.91 L16.22 16.49 L17.08 16.49 Z"/>
        <path d="M17.52 15.35 C17.69 15.35 17.83 15.21 17.83 15.04 L17.83 12.81 C17.83 12.63 17.69 12.5 17.52 12.5 L15.28 12.5 C15.11 12.5 14.97 12.63 14.97 12.81 L14.97 13.78 L13.59 13.78 L13.59 12.81 C13.59 12.63 13.45 12.5 13.28 12.5 L11.05 12.5 C10.87 12.5 10.74 12.63 10.74 12.81 L10.74 13.78 L9.36 13.78 L9.36 12.81 C9.36 12.63 9.22 12.5 9.05 12.5 L6.81 12.5 C6.64 12.5 6.5 12.63 6.5 12.81 L6.5 15.04 C6.5 15.21 6.64 15.35 6.81 15.35 L7.73 15.35 L7.73 16.05 L6.81 16.05 C6.64 16.05 6.5 16.19 6.5 16.36 L6.5 18.6 C6.5 18.77 6.64 18.91 6.81 18.91 L7.73 18.91 L7.73 19.61 L6.81 19.61 C6.64 19.61 6.5 19.75 6.5 19.92 L6.5 22.15 C6.5 22.33 6.64 22.46 6.81 22.46 L9.05 22.46 C9.22 22.46 9.36 22.33 9.36 22.15 L9.36 21.18 L10.74 21.18 L10.74 22.15 C10.74 22.33 10.87 22.46 11.05 22.46 L13.28 22.46 C13.45 22.46 13.59 22.33 13.59 22.15 L13.59 21.18 L14.97 21.18 L14.97 22.15 C14.97 22.33 15.11 22.46 15.28 22.46 L17.52 22.46 C17.69 22.46 17.83 22.33 17.83 22.15 L17.83 19.92 C17.83 19.75 17.69 19.61 17.52 19.61 L16.64 19.61 L16.64 18.91 L17.52 18.91 C17.69 18.91 17.83 18.77 17.83 18.6 L17.83 16.36 C17.83 16.19 17.69 16.05 17.52 16.05 L16.64 16.05 L16.64 15.35 L17.52 15.35 Z M17.08 16.49 C17.25 16.49 17.39 16.63 17.39 16.81 L17.39 18.16 C17.39 18.33 17.25 18.47 17.08 18.47 L16.22 18.47 L16.22 20.05 L17.08 20.05 C17.25 20.05 17.39 20.19 17.39 20.36 L17.39 21.71 C17.39 21.88 17.25 22.02 17.08 22.02 L15.73 22.02 C15.56 22.02 15.42 21.88 15.42 21.71 L15.42 20.79 L13.18 20.79 L13.18 21.71 C13.18 21.88 13.04 22.02 12.87 22.02 L11.52 22.02 C11.35 22.02 11.21 21.88 11.21 21.71 L11.21 20.79 L8.91 20.79 L8.91 21.71 C8.91 21.88 8.77 22.02 8.6 22.02 L7.25 22.02 C7.08 22.02 6.94 21.88 6.94 21.71 L6.94 20.36 C6.94 20.19 7.08 20.05 7.25 20.05 L8.15 20.05 L8.15 18.47 L7.25 18.47 C7.08 18.47 6.94 18.33 6.94 18.16 L6.94 16.81 C6.94 16.63 7.08 16.49 7.25 16.49 L8.15 16.49 L8.15 14.91 L7.25 14.91 C7.08 14.91 6.94 14.77 6.94 14.6 L6.94 13.25 C6.94 13.08 7.08 12.94 7.25 12.94 L8.6 12.94 C8.77 12.94 8.91 13.08 8.91 13.25 L8.91 14.16 L11.21 14.16 L11.21 13.25 C11.21 13.08 11.35 12.94 11.52 12.94 L12.87 12.94 C13.04 12.94 13.18 13.08 13.18 13.25 L13.18 14.16 L15.42 14.16 L15.42 13.25 C15.42 13.08 15.56 12.94 15.73 12.94 L17.08 12.94 C17.25 12.94 17.39 13.08 17.39 13.25 L17.39 14.6 C17.39 14.77 17.25 14.91 17.08 14.91 L16.22 14.91 L16.22 16.49 L17.08 16.49 Z"/>
    </g>
`;

function directCursorCss(extra = ''): string {
    return cursorCss(directCursor.replace('{extra}', extra));
}

//---------------------------------------------------------------------------

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        '.cursor-solid-ptr': { cursor: cursorCss(selectionPointer) },
        '.cursor-solid-hover': { cursor: cursorCss(selectionPointerHover) },
        '.cursor-solid-move': { cursor: cursorCss(selectionMove) },
        '.cursor-resize-ew': { cursor: cursorCss(resizeHorizontal, 12, 12) },
        '.cursor-resize-ns': { cursor: cursorCss(resizeVertical, 12, 12) },
        '.cursor-resize-nw': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-se': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-ne': { cursor: cursorCss(resizeNeSw, 12, 12) },
        '.cursor-resize-sw': { cursor: cursorCss(resizeNeSw, 12, 12) },

        '.cursor-pen': { cursor: penCursorCss() },
        '.cursor-pen-add': { cursor: penCursorCss('add') },
        '.cursor-pen-delete': { cursor: penCursorCss('delete') },
        '.cursor-pen-continue': { cursor: penCursorCss('continue') },
        '.cursor-pen-close': { cursor: penCursorCss('close') },
        '.cursor-pen-convert': { cursor: penCursorCss('convert') },
        
        '.cursor-direct-ptr': { cursor: directCursorCss() },
        '.cursor-direct-hover': { cursor: directCursorCss(directHoverMark) },
        '.cursor-direct-point': { cursor: directCursorCss(directPointMark) },
        '.cursor-direct-move': { cursor: directCursorCss(directMoveMark) },
        '.cursor-direct-add': { cursor: directCursorCss(PEN_BADGES.add) },
        '.cursor-direct-delete': { cursor: directCursorCss(PEN_BADGES.delete) },
        '.cursor-direct-convert': { cursor: directCursorCss(PEN_BADGES.convert) },
    });
}

export default cursorsPlugin;

//---------------------------------------------------------------------------
