import type { PluginAPI } from 'tailwindcss/plugin';
import { ROTATE_CURSOR_DEGREES, ROTATE_GLYPH } from './rotate-glyph';
import { cursorCss } from './cursor-css';
import { selectionMove, selectionPointer, selectionPointerHover } from './cursor-selection';
import { resizeHorizontal, resizeVertical, resizeNwSe, resizeNeSw } from './cursor-resize';
import { directCursorCss, directHoverMark, directPointMark, directMoveMark } from './cursor-direct';
import { PEN_BADGES, penCursorCss } from './cursor-pen';

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

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        '.cursor-solid-move': { cursor: cursorCss(selectionMove) },
        '.cursor-resize-ew': { cursor: cursorCss(resizeHorizontal, 12, 12) },
        '.cursor-resize-ns': { cursor: cursorCss(resizeVertical, 12, 12) },
        '.cursor-resize-nw': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-se': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-ne': { cursor: cursorCss(resizeNeSw, 12, 12) },
        '.cursor-resize-sw': { cursor: cursorCss(resizeNeSw, 12, 12) },
        
        '.cursor-solid-ptr': { cursor: cursorCss(selectionPointer) },
        '.cursor-solid-hover': { cursor: cursorCss(selectionPointerHover) },

        '.cursor-direct-ptr': { cursor: directCursorCss() },
        '.cursor-direct-hover': { cursor: directCursorCss(directHoverMark) },
        '.cursor-direct-point': { cursor: directCursorCss(directPointMark) },
        '.cursor-direct-move': { cursor: directCursorCss(directMoveMark) },
        '.cursor-direct-add': { cursor: directCursorCss(PEN_BADGES.add) },
        '.cursor-direct-delete': { cursor: directCursorCss(PEN_BADGES.delete) },
        '.cursor-direct-convert': { cursor: directCursorCss(PEN_BADGES.convert) },

        '.cursor-pen': { cursor: penCursorCss() },
        '.cursor-pen-add': { cursor: penCursorCss('add') },
        '.cursor-pen-delete': { cursor: penCursorCss('delete') },
        '.cursor-pen-continue': { cursor: penCursorCss('continue') },
        '.cursor-pen-close': { cursor: penCursorCss('close') },
        '.cursor-pen-convert': { cursor: penCursorCss('convert') },
    });
}

export default cursorsPlugin;
