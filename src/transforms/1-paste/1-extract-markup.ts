import { knownSvgElementName } from "../0-markup/2-svg-names";
import { type PasteBlock } from "./9-paste-types";

/**
 * Cuts the markup out of the code around it: a whole component file (`export function Icon() { return (<svg>...</svg>); }`),
 * a Markdown code fence, or a sentence with an SVG in it. Text that already is markup from start to end is left alone.
 */
export const extractMarkupBlock: PasteBlock = {
    id: 'extract-markup',
    label: 'Extract markup from code',
    apply: (data) => {
        const text = data.text.trim();
        if (text.startsWith('<') && text.endsWith('>')) {
            return undefined;
        }
        const markup = extractMarkup(text);
        return markup ? { ...data, text: markup } : undefined;
    },
};

export function extractMarkup(text: string): string | undefined {
    const svgStart = /<svg[\s>/]/i.exec(text);
    if (svgStart) {
        const closes = [...text.matchAll(/<\/svg\s*>/gi)];
        const last = closes[closes.length - 1];
        const end = last ? last.index + last[0].length : lastTagEnd(text);
        return end > svgStart.index ? text.slice(svgStart.index, end) : undefined;
    }

    // Bare elements start at the first tag that names an SVG element, which skips TypeScript generics such as SVGProps<SVGSVGElement>
    for (const m of text.matchAll(/<([A-Za-z][\w]*)/g)) {
        if (knownSvgElementName(m[1])) {
            const end = lastTagEnd(text);
            return end > m.index ? text.slice(m.index, end) : undefined;
        }
    }
    return undefined;
}

/** End of the last closing tag or self-closing tag */
function lastTagEnd(text: string): number {
    let end = -1;
    for (const m of text.matchAll(/\/>|<\/[\w.:-]*\s*>/g)) {
        end = m.index + m[0].length;
    }
    return end;
}
