/**
 * Markup of the `<defs>` elements that is deactivated in place.
 * - An element is turned off by wrapping its markup in a comment: `<!--svg-led:off <element>-->`.
 * - A class is turned off by commenting out the declarations of its rule: `.name{/*svg-led:off <declarations>*\/}`.
 * Pure string helpers: no DOM, so they work in tests and in the source map.
 */

/** Opens a deactivated element; its markup follows, up to `OFF_CLOSE` */
export const OFF_OPEN = '<!--svg-led:off ';
export const OFF_CLOSE = '-->';

/** Opens the original declarations kept in a deactivated class rule; they end at `CSS_OFF_CLOSE` */
export const CSS_OFF_OPEN = '/*svg-led:off ';
export const CSS_OFF_CLOSE = '*/';

export type OffBlock = {
    /** Offset of `OFF_OPEN` */
    start: number;
    /** Offset after `OFF_CLOSE` */
    end: number;
    contentStart: number;
    contentEnd: number;
};

/** Deactivated elements of `text`, in document order */
export function offBlocksOf(text: string): OffBlock[] {
    const rv: OffBlock[] = [];
    let p = text.indexOf(OFF_OPEN);
    while (p !== -1) {
        const contentStart = p + OFF_OPEN.length;
        const close = text.indexOf(OFF_CLOSE, contentStart);
        if (close === -1) {
            break;
        }
        const end = close + OFF_CLOSE.length;
        rv.push({ start: p, end, contentStart, contentEnd: close });
        p = text.indexOf(OFF_OPEN, end);
    }
    return rv;
}

/** The declarations kept in a deactivated class rule, or undefined when the rule is active */
export function cssOriginalBody(body: string): string | undefined {
    return /^\s*\/\*svg-led:off ([\s\S]*?)\*\/\s*$/.exec(body)?.[1];
}

export type CssRule = {
    /** Offset of the first selector in the stylesheet, after any comment or CDATA marker before it */
    start: number;
    /** Offset after the closing brace */
    end: number;
    selectors: string[];
    body: string;
};

/** Rules of a stylesheet in document order. Only the text between braces is read, so nested blocks are not supported. */
export function cssRulesOf(css: string): CssRule[] {
    const rv: CssRule[] = [];
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        const headStart = m.index;
        const headEnd = headStart + m[1].length;
        let start = headStart;
        for (let j = /^(\s+|\/\*[\s\S]*?\*\/|<!\[CDATA\[|\]\]>)/.exec(css.slice(start, headEnd)); j; j = /^(\s+|\/\*[\s\S]*?\*\/|<!\[CDATA\[|\]\]>)/.exec(css.slice(start, headEnd))) {
            start += j[0].length;
        }
        const selectors = css.slice(start, headEnd)
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/<!\[CDATA\[|\]\]>/g, '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        rv.push({ start, end: headStart + m[0].length, selectors, body: m[2] });
    }
    return rv;
}
