import { cursorCss } from './8-cursor-css';

/** Empty canvas, nothing selected: just the arrow */
export const selectionPointer = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="0,0 15.41,15.41 6.92,15.41 0,22.37 0,0" fill="#fefefe"/>
        <polygon points="1,2.41 12.99,14.41 6.5,14.41 1,19.94 1,2.41"/>
        <path fill="#fefefe" d="M5.99,13.51l-2.44,2.45-1.55,1.56V4.83l8.58,8.58h-4.32c-.11.01-.18.03-.27.1Z"/>
    </svg>
`;

//---------------------------------------------------------------------------

/** Pointer over an object that is not selected yet: arrow plus a small square at its lower right*/
export const selectionPointerHover = `
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
export const selectionMove = `
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
