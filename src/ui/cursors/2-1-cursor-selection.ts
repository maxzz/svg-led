import { arrowCursorMark, cursorCss, removeSvgComments } from './2-0-shared';

/** Empty canvas, nothing selected: just the arrow */
export const selectionPointer = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        ${arrowCursorMark}
        {extra}
    </svg>
`;

//---------------------------------------------------------------------------

/** Pointer over an object that is not selected yet: arrow plus a small square at its lower right*/
export const selectionPointerHoverMark = `
    <!-- white 1px border, then the black square -->
    <rect x="12" y="14" width="8" height="8" fill="#fff"/>
    <rect x="13" y="15" width="6" height="6" fill="#000"/>
`;

export function selectionCursorCss(extra = ''): string {
    return cursorCss(removeSvgComments(selectionPointer.replace('{extra}', extra)));
}
