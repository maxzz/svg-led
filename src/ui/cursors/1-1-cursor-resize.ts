import { cursorCss } from './8-cursor-css';

/**
 * Horizontal resize. Double arrow centered on the 24×24 grid; the hotspot is that center.
 * White shape is the black arrow with a 2px stroke, so 1px of white shows around it.
 */
export const resizeHorizontal = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="2,12 7,8 7,11 17,11 17,8 22,12 17,16 17,13 7,13 7,16" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="2,12 7,8 7,11 17,11 17,8 22,12 17,16 17,13 7,13 7,16" fill="#000"/>
    </svg>
`;

/** Vertical resize. Same arrow as the horizontal one, turned on its center. */
export const resizeVertical = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="12,2 16,7 13,7 13,17 16,17 12,22 8,17 11,17 11,7 8,7" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="12,2 16,7 13,7 13,17 16,17 12,22 8,17 11,17 11,7 8,7" fill="#000"/>
    </svg>
`;

/** Northwest–southeast resize. The horizontal arrow rotated 45° around the center. Shared by the nw and se corners. */
export const resizeNwSe = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="4.9,4.9 11.3,5.6 9.2,7.8 16.2,14.8 18.4,12.7 19.1,19.1 12.7,18.4 14.8,16.2 7.8,9.2 5.6,11.3" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="4.9,4.9 11.3,5.6 9.2,7.8 16.2,14.8 18.4,12.7 19.1,19.1 12.7,18.4 14.8,16.2 7.8,9.2 5.6,11.3" fill="#000"/>
    </svg>
`;

/** Northeast–southwest resize. The horizontal arrow rotated the other way. Shared by the ne and sw corners. */
export const resizeNeSw = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="4.9,19.1 5.6,12.7 7.8,14.8 14.8,7.8 12.7,5.6 19.1,4.9 18.4,11.3 16.2,9.2 9.2,16.2 11.3,18.4" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <polygon points="4.9,19.1 5.6,12.7 7.8,14.8 14.8,7.8 12.7,5.6 19.1,4.9 18.4,11.3 16.2,9.2 9.2,16.2 11.3,18.4" fill="#000"/>
    </svg>
`;
