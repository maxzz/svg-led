import { cursorCss } from './8-cursor-css';

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
export const PEN_BADGES = {
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

export function penCursorCss(badge?: keyof typeof PEN_BADGES): string {
    return cursorCss(penCursor.replace('{badge}', badge ? PEN_BADGES[badge] : ''), 2, 2);
}
