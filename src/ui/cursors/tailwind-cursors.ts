import type { PluginAPI } from 'tailwindcss/plugin';
import { cursorCss } from './8-cursor-css';
import { resizeHorizontal, resizeVertical, resizeNwSe, resizeNeSw } from './1-1-cursor-resize';
import { selectionMove, selectionPointer, selectionPointerHover } from './2-1-cursor-selection';
import { directCursorCss, directHoverMark, directPointMark, directMoveMark } from './2-2-cursor-direct';
import { PEN_BADGES, penCursorCss } from './2-3-cursor-pen';

//---------------------------------------------------------------------------

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        // Resize cursor
        '.cursor-resize-ew': { cursor: cursorCss(resizeHorizontal, 12, 12) },
        '.cursor-resize-ns': { cursor: cursorCss(resizeVertical, 12, 12) },
        '.cursor-resize-nw': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-se': { cursor: cursorCss(resizeNwSe, 12, 12) },
        '.cursor-resize-ne': { cursor: cursorCss(resizeNeSw, 12, 12) },
        '.cursor-resize-sw': { cursor: cursorCss(resizeNeSw, 12, 12) },

        // Selection cursor
        '.cursor-solid-ptr': { cursor: cursorCss(selectionPointer) },
        '.cursor-solid-hover': { cursor: cursorCss(selectionPointerHover) },
        '.cursor-solid-move': { cursor: cursorCss(selectionMove) },

        // Direct selection cursor
        '.cursor-direct-ptr': { cursor: directCursorCss() },
        '.cursor-direct-hover': { cursor: directCursorCss(directHoverMark) },
        '.cursor-direct-move': { cursor: directCursorCss(directMoveMark) },

        '.cursor-direct-point': { cursor: directCursorCss(directPointMark) },
        '.cursor-direct-add': { cursor: directCursorCss(PEN_BADGES.add) },
        '.cursor-direct-delete': { cursor: directCursorCss(PEN_BADGES.delete) },
        '.cursor-direct-convert': { cursor: directCursorCss(PEN_BADGES.convert) },

        // Pen cursor
        '.cursor-pen': { cursor: penCursorCss() },
        '.cursor-pen-add': { cursor: penCursorCss('add') },
        '.cursor-pen-delete': { cursor: penCursorCss('delete') },
        '.cursor-pen-convert': { cursor: penCursorCss('convert') },
        '.cursor-pen-continue': { cursor: penCursorCss('continue') },
        '.cursor-pen-close': { cursor: penCursorCss('close') },
    });
}

export default cursorsPlugin;
