import type { PluginAPI } from 'tailwindcss/plugin';

// Cursor artwork is plain SVG markup, kept literal so it can be edited in an external editor and pasted back.
// Drawn on a 24x24 grid (one unit = one CSS pixel).
// Rules: every black shape has a white border at least 1px wide, and every line or dot is at least 1px thick.
// Lines are centered on pixel centers (x.5) so a 1px stroke covers exactly one pixel.

function svgToDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

/** The hotspot is the arrow tip at (1, 1) and at 0 0 is white border */
function cursorCss(svg: string): string {
    return `url("${svgToDataUri(svg)}") 1 1, default`;
}

//---------------------------------------------------------------------------

/** Empty canvas, nothing selected: just the arrow */
export const selectionPointer = cursorCss(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- white 1px border: a 2px stroke, half of it covered by the black fill -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <!-- solid arrow -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
    </svg>
`);

//---------------------------------------------------------------------------

/** Pointer over an object that is not selected yet: arrow plus a small square at its lower right: the square is white, the arrow is black */
export const selectionPointerHover = cursorCss(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- arrow, with its white border -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
        <!-- square: white 1px border, then the black square -->
        <rect x="12" y="14" width="8" height="8" fill="#fff"/>
        <rect x="13" y="15" width="6" height="6" fill="#000"/>
    </svg>
`);

//---------------------------------------------------------------------------

/** One or more objects selected: arrow plus a four-way move icon at its lower right: the move icon is white, the arrow is black */
export const selectionMove = cursorCss(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- arrow, with its white border -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
        <!-- move icon: white halo, 1px on each side of the 1px black lines and arrowheads -->
        <path d="M16.5 10.5V22.5M10.5 16.5H22.5" fill="none" stroke="#fff" stroke-width="3"/>
        <polygon points="16.5,10.5 14,14.5 19,14.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="16.5,22.5 14,18.5 19,18.5" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="10.5,16.5 14.5,14 14.5,19" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="22.5,16.5 18.5,14 18.5,19" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <!-- move icon: black 1px lines and solid arrowheads -->
        <path d="M16.5 10.5V22.5M10.5 16.5H22.5" fill="none" stroke="#000" stroke-width="1"/>
        <polygon points="16.5,10.5 14,14.5 19,14.5" fill="#000"/>
        <polygon points="16.5,22.5 14,18.5 19,18.5" fill="#000"/>
        <polygon points="10.5,16.5 14.5,14 14.5,19" fill="#000"/>
        <polygon points="22.5,16.5 18.5,14 18.5,19" fill="#000"/>
    </svg>
`);

//---------------------------------------------------------------------------

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        '.cursor-svg-pointer': { cursor: selectionPointer },
        '.cursor-svg-pointer-hover': { cursor: selectionPointerHover },
        '.cursor-svg-move': { cursor: selectionMove },
    });
}

export default cursorsPlugin;

//---------------------------------------------------------------------------
