import { cursorCss, removeSvgComments } from './8-cursor-css';
import { PEN_BADGES } from './2-3-cursor-pen';
import { arrowCursorMark, cursorMoveMark, pointsInnerMark } from './2-0-shared';

/**
 * Direct selection: the same arrow as the Selection tool, filled white with a 1px black edge,
 * so the two tools stay distinct. `{extra}` is the mark at the lower right (or nothing).
 */
const directCursor = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    ${arrowCursorMark}
    ${pointsInnerMark}
    {extra}
</svg>
`;

/** Over an object that is not selected yet: the white arrow plus a small square */
export const directHoverMark = `
    <rect x="12" y="14" width="8" height="8" fill="#fff"/>
    <rect x="13" y="15" width="6" height="6" fill="#000"/>
`;

/** Over a path point: the white arrow plus a small unfilled square at its lower right (white 1px border, black 1px edge) */
export const directPointMark = `
    <rect x="13.5" y="15.5" width="5" height="5" fill="none" stroke="#fff" stroke-width="3"/>
    <rect x="13.5" y="15.5" width="5" height="5" fill="none" stroke="#000" stroke-width="1"/>
`;

export function directCursorCss(extra = ''): string {
    return cursorCss(removeSvgComments(directCursor.replace('{extra}', extra)));
}
