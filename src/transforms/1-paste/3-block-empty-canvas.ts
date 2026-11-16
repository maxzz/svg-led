import { escapeXmlAttr } from "../0-markup/1-markup-tree";
import { type PasteBlock, type PasteContext } from "./9-paste-types";

//---------------------------------------------------------------------------

/** On an empty canvas a whole <svg> becomes the document, so its viewBox and root attributes are kept */
export const Block_adoptDocument: PasteBlock = {
    id: 'adopt-document',
    label: 'Whole SVG on an empty canvas',
    apply: (data, ctx) => ctx.docIsEmpty && !data.asDocument && isSvgDocumentText(data.text) ? { ...data, asDocument: true } : undefined,
};

//---------------------------------------------------------------------------

/** On an empty canvas bare elements are wrapped into an <svg> with the document's viewBox and root attributes */
export const Block_wrapFragment: PasteBlock = {
    id: 'wrap-fragment',
    label: 'Wrap bare elements into <svg>',
    apply: (data, ctx) => {
        const text = data.text.trim();
        if (!ctx.docIsEmpty || data.asDocument || !text.startsWith('<') || isSvgDocumentText(text)) {
            return undefined;
        }
        return { text: wrapInSvg(text, ctx), asDocument: true };
    },
};

//---------------------------------------------------------------------------

/** True when the first element of the text is <svg> (after an XML declaration, DOCTYPE or comments) */
export function isSvgDocumentText(text: string): boolean {
    return /^\s*(?:<\?[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>[]*(?:\[[\s\S]*?\])?\s*>\s*)*<svg[\s>/]/i.test(text);
}

export function wrapInSvg(markup: string, ctx: PasteContext): string {
    const attrs: [string, string][] = [['xmlns', ctx.rootAttrs.xmlns ?? 'http://www.w3.org/2000/svg']];
    if (markup.includes('xlink:') && !ctx.rootAttrs['xmlns:xlink']) {
        attrs.push(['xmlns:xlink', 'http://www.w3.org/1999/xlink']);
    }
    const vb = ctx.viewBox;
    if (vb) {
        attrs.push(['viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`]);
    }
    for (const [k, v] of Object.entries(ctx.rootAttrs)) {
        k !== 'xmlns' && attrs.push([k, v]);
    }
    return `<svg${attrs.map(([k, v]) => ` ${k}="${escapeXmlAttr(v, '"')}"`).join('')}>\n${markup}\n</svg>`;
}
