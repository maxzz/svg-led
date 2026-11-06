
// Cursor artwork is plain SVG markup, kept literal so it can be edited in an external editor and pasted back.
// Drawn on a 24x24 grid (one unit = one CSS pixel).
// Rules: every black shape has a white border at least 1px wide, and every line or dot is at least 1px thick.
// Lines are centered on pixel centers (x.5) so a 1px stroke covers exactly one pixel.

function svgToDataUri(svg: string): string {
    // HTML comments are for maintainers only; strip them so they are not exported with the cursor
    const markup = svg.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
    return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

/** Hotspot defaults to the selection-arrow tip at (1, 1). Resize cursors pass the center of the glyph. */
export function cursorCss(svg: string, hotX = 1, hotY = 1): string {
    return `url("${svgToDataUri(svg)}") ${hotX} ${hotY}, default`;
}
