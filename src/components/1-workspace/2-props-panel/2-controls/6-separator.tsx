/**
 * Horizontal line between groups of the Properties popup.
 * It spans the popup from edge to edge: the negative margins cancel the popup content's side padding.
 * 
 * Changed the separator so it draws a true one-pixel line (i.e. pixel-perfect).
 * The old version used h-px, which is one CSS pixel. On a display scaled above 100%, 
 * that pixel gets smeared across two device pixels and looks thick. 
 * The new version is a zero-height box with a 1px top border. 
 * Chrome and Electron snap border widths to whole device pixels, 
 * so the line should render as exactly one device pixel.
 */
export function PropertiesSeparator() {
    return (
        <div role="separator" className="shrink-0 -mx-2 h-0 border-t border-foreground/10" />
    );
}
