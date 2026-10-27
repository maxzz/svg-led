import type { PluginAPI } from 'tailwindcss/plugin';

// Cursor artwork is plain SVG markup, kept literal so it can be edited in an external editor and pasted back.
// Drawn on a 24x24 grid (one unit = one CSS pixel).
// Rules: every black shape has a white border at least 1px wide, and every line or dot is at least 1px thick.
// Lines are centered on pixel centers (x.5) so a 1px stroke covers exactly one pixel.

function svgToDataUri(svg: string): string {
    // HTML comments are for maintainers only; strip them so they are not exported with the cursor
    const markup = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
    return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

/** The hotspot is the arrow tip at (1, 1) and at 0 0 is white border */
function cursorCss(svg: string): string {
    return `url("${svgToDataUri(svg)}") 1 1, default`;
}

//---------------------------------------------------------------------------

/** Empty canvas, nothing selected: just the arrow */
const selectionPointer = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <!-- white 1px border: a 2px stroke, half of it covered by the black fill -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
        <!-- solid arrow -->
        <path d="M1 1V14.65L1.84 14.58L5.49 10.57L10.4 10.59L10.24 10.09L1.42 1.16Z" fill="#000"/>
    </svg>
`;

//---------------------------------------------------------------------------

/** Pointer over an object that is not selected yet: arrow plus a small square at its lower right*/
const selectionPointerHover = `
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
const selectionMove = `
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

//---------------------------------------------------------------------------

export function cursorsPlugin({ addUtilities }: PluginAPI): void {
    addUtilities({
        '.cursor-solid-ptr': { cursor: cursorCss(selectionPointer) },
        '.cursor-solid-hover': { cursor: cursorCss(selectionPointerHover) },
        '.cursor-solid-move': { cursor: cursorCss(selectionMove) },
    });
}

export default cursorsPlugin;

//---------------------------------------------------------------------------
