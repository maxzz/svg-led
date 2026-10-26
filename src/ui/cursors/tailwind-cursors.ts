import type { PluginAPI } from 'tailwindcss/plugin';

// Cursor artwork, drawn on a 24x24 grid (one unit = one CSS pixel).
// Rules: every black shape has a white border at least 1px wide, and every line or dot is at least 1px thick.
// Lines are centered on pixel centers (x.5) so a 1px stroke covers exactly one pixel.

const SIZE = 24;
const BLACK = '#000';
const WHITE = '#fff';

/** Solid arrow. Its tip is at (1, 1), so the 1px white border still fits inside the 24px box. */
const ARROW = 'M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z';

/** The arrow tip is the hotspot */
const HOTSPOT = '1 1';

function svgToDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

function cursorCss(body: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`;
    return `url("${svgToDataUri(svg)}") ${HOTSPOT}, default`;
}

/** White 1px border (a 2px stroke, half of it covered by the black fill) under a black shape */
function withWhiteBorder(d: string): string {
    return `<path d="${d}" fill="${WHITE}" stroke="${WHITE}" stroke-width="2" stroke-linejoin="round"/>`;
}

function arrow(): string {
    return `${withWhiteBorder(ARROW)}<path d="${ARROW}" fill="${BLACK}"/>`;
}

/** Small solid square at the lower right of the arrow: an unselected object is under the pointer */
function badge(): string {
    return `<rect x="12" y="14" width="8" height="8" fill="${WHITE}"/><rect x="13" y="15" width="6" height="6" fill="${BLACK}"/>`;
}

/** Four-way move icon at the lower right of the arrow: one or more objects are selected */
function moveIcon(): string {
    // center (16.5, 16.5): the arms reach 6px, so the arrow tips and their 1px halos stay inside the 24px box
    const lines = 'M16.5 10.5V22.5M10.5 16.5H22.5';
    const heads = [
        '16.5,10.5 14,14.5 19,14.5', // up
        '16.5,22.5 14,18.5 19,18.5', // down
        '10.5,16.5 14.5,14 14.5,19', // left
        '22.5,16.5 18.5,14 18.5,19', // right
    ];
    return [
        // white halo, 1px on each side of the 1px black lines and arrowheads
        `<path d="${lines}" fill="none" stroke="${WHITE}" stroke-width="3"/>`,
        ...heads.map((points) => `<polygon points="${points}" fill="${WHITE}" stroke="${WHITE}" stroke-width="2" stroke-linejoin="round"/>`),
        // black 1px lines and solid arrowheads
        `<path d="${lines}" fill="none" stroke="${BLACK}" stroke-width="1"/>`,
        ...heads.map((points) => `<polygon points="${points}" fill="${BLACK}"/>`),
    ].join('');
}

/** Empty canvas, nothing selected */
export const selectionPointer = cursorCss(arrow());

/** Pointer over an object that is not selected yet */
export const selectionPointerHover = cursorCss(`${arrow()}${badge()}`);

/** One or more objects selected */
export const selectionMove = cursorCss(`${arrow()}${moveIcon()}`);

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        '.cursor-svg-pointer': { cursor: selectionPointer },
        '.cursor-svg-pointer-hover': { cursor: selectionPointerHover },
        '.cursor-svg-move': { cursor: selectionMove },
    });
}

export default cursorsPlugin;
