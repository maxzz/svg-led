import { parseMarkup, printSvgMarkup } from "../0-markup/1-markup-tree";

/** SVG on one line with single-quoted attributes, without the XML declaration, DOCTYPE and comments */
export function minifySvg(svg: string): string {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return svg.replace(/>\s+</g, '><').trim();
    }
    return printSvgMarkup(nodes.filter((n) => n.kind === 'el'), { indent: '', quote: "'" });
}

/** `data:image/svg+xml,...` with only the characters that need it percent-encoded (smaller than base64), or base64 */
export function svgToDataUri(svg: string, base64: boolean): string {
    const compact = minifySvg(svg);
    if (base64) {
        return `data:image/svg+xml;base64,${toBase64(compact)}`;
    }
    return `data:image/svg+xml,${compact.replace(/[\r\n%#()<>?[\\\]^`{|}"]/g, encodeURIComponent)}`;
}

export function dataUriAsCss(uri: string): string {
    return `background-image: url("${uri}");\n`;
}

function toBase64(text: string): string {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}
