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
 * The other angles are this same drawing turned around the hotspot (16.5, 16.5).
 * Edit the points here. Each arrow is three corners — outer tip, inner corner on the
 * vertical back, and the corner that meets the arc. The white shape is the black one
 * with a stroke, so 1px of white shows around it.
 */
const rotateCursor = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" d="M10.2 6.8 C15.938 9.558 16.587 14.357 16.587 16.5 C16.587 18.643 15.957 23.986 10.2 26.2"/>
    <polygon points="13.8,27.5 8.9,27.5 8.9,21.8" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="miter"/>
    <polygon points="13.8,27.5 8.9,27.5 8.9,21.8" fill="#000"/>
    <polygon points="13.8,5.5 8.9,5.5 8.9,11.2" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="miter"/>
    <polygon points="13.8,5.5 8.9,5.5 8.9,11.2" fill="#000"/>
    <path fill="none" stroke="#000" stroke-width="1" stroke-linecap="round" d="M10.2 6.8 C15.938 9.558 16.587 14.357 16.587 16.5 C16.587 18.643 15.957 23.986 10.2 26.2"/>
</svg>
`;

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
    });
}

export default cursorsPlugin;

//---------------------------------------------------------------------------
