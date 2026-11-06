import type { PluginAPI } from 'tailwindcss/plugin';
import { cursorCss } from './cursor-css';
import { selectionMove, selectionPointer, selectionPointerHover } from './cursor-selection';
import { resizeHorizontal, resizeVertical, resizeNwSe, resizeNeSw } from './cursor-resize';
import { directCursorCss, directHoverMark, directPointMark, directMoveMark } from './cursor-direct';
import { PEN_BADGES, penCursorCss } from './cursor-pen';

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
