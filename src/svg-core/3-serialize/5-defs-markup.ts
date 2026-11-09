/**
 * Deactivation in the markup of `<defs>` elements. Nothing is removed, and everything can be reactivated:
 * - an element (`<defs>`, `<style>`, or any child of them) is deactivated by a prefix on its tag: `<deactivated-defs>`;
 * - a class is deactivated by the same prefix on its selector: `.deactivated-class-one`;
 * - a declaration is deactivated by commenting it out, with the marker `svg-led:off` first in the comment.
 * Pure string helpers: no DOM, so they work in tests and in the source map.
 */

//---------------------------------------------------------------------------

/** Prefix of a deactivated tag or class name */
export const DEACTIVATED_PREFIX = 'deactivated-';

/** Opens a deactivated declaration; its text follows, up to `CSS_OFF_CLOSE` */
export const CSS_OFF_OPEN = '/*svg-led:off ';
export const CSS_OFF_CLOSE = '*/';

//---------------------------------------------------------------------------

/** True when a tag or class name carries the prefix */
export function isDeactivatedName(name: string): boolean {
    return name.toLowerCase().startsWith(DEACTIVATED_PREFIX);
}

/** The name without the prefix */
export function plainName(name: string): string {
    return isDeactivatedName(name) ? name.slice(DEACTIVATED_PREFIX.length) : name;
}

/** The name with the prefix, or without it */
export function deactivatedName(name: string, deactivated: boolean): string {
    return deactivated ? DEACTIVATED_PREFIX + plainName(name) : plainName(name);
}

//---------------------------------------------------------------------------

/**
 * Renames the element of `markup` to deactivated or back: its start tag, and its end tag when it has one.
 * Returns the same text when the element already has that state.
 */
export function setTagDeactivatedInMarkup(markup: string, deactivated: boolean): string {
    const from = /^<([^\s/>]+)/.exec(markup)?.[1];
    if (!from || isDeactivatedName(from) === deactivated) {
        return markup;
    }
    const to = deactivatedName(from, deactivated);
    const gt = markup.indexOf('>');
    const selfClosing = gt > 0 && markup[gt - 1] === '/';
    let out = `<${to}${markup.slice(1 + from.length)}`;
    const close = out.lastIndexOf('</');
    const end = /^<\/([^\s>]+)\s*>$/.exec(out.slice(close));
    if (!selfClosing && close > 0 && end?.[1] === from) {
        out = `${out.slice(0, close)}</${to}${out.slice(close + 2 + from.length)}`;
    }
    return out;
}

/** The class a selector names (`.name` or `.deactivated-name`), and whether it is deactivated; undefined for other selectors */
export function classOfSelector(selector: string): { name: string; deactivated: boolean; } | undefined {
    const raw = /^\.([A-Za-z_][\w-]*)$/.exec(selector)?.[1];
    const name = raw && plainName(raw);
    return name ? { name, deactivated: isDeactivatedName(raw) } : undefined;
}

/** Renames the selectors of class `name` in a selector list (the text before a rule's `{`) to deactivated or back */
export function renameClassInSelectors(head: string, name: string, deactivated: boolean): string {
    const from = deactivatedName(name, !deactivated);
    const to = deactivatedName(name, deactivated);
    return head.replace(new RegExp(`(^|[\\s,])\\.${from}(?![\\w-])`, 'g'), `$1.${to}`);
}

export type CssRule = {
    /** Offset of the first selector, after any comment or CDATA marker before it */
    start: number;
    /** Offset of the opening brace */
    headEnd: number;
    /** Offset of the first character of the body */
    bodyStart: number;
    /** Offset of the closing brace */
    bodyEnd: number;
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
        const bodyStart = headEnd + 1;
        rv.push({ start, headEnd, bodyStart, bodyEnd: bodyStart + m[2].length, end: headStart + m[0].length, selectors, body: m[2] });
    }
    return rv;
}

export type CssDecl = {
    /** Offsets in the stylesheet: the declaration, or its whole comment when it is deactivated */
    start: number;
    end: number;
    /** The declaration text, with its `;` when it had one. For a deactivated declaration: the text inside the comment */
    text: string;
    /** True when the declaration is commented out */
    off: boolean;
};

/** Declarations of one rule, in order. A deactivated declaration is one that sits inside the comment marker. */
export function cssDeclsOf(css: string, rule: CssRule): CssDecl[] {
    const rv: CssDecl[] = [];
    const body = rule.body;
    const base = rule.bodyStart;
    let i = 0;
    while (i < body.length) {
        if (/[\s;]/.test(body[i])) {
            i++;
        } else if (body.startsWith(CSS_OFF_OPEN, i)) {
            const close = body.indexOf(CSS_OFF_CLOSE, i + CSS_OFF_OPEN.length);
            if (close === -1) {
                break;
            }
            rv.push({ start: base + i, end: base + close + CSS_OFF_CLOSE.length, text: body.slice(i + CSS_OFF_OPEN.length, close), off: true });
            i = close + CSS_OFF_CLOSE.length;
        } else if (body.startsWith('/*', i)) {
            // an ordinary comment is not a declaration
            const close = body.indexOf('*/', i + 2);
            if (close === -1) {
                break;
            }
            i = close + 2;
        } else {
            // a declaration runs to the next `;`, or to the next comment
            let j = i;
            while (j < body.length && body[j] !== ';' && !body.startsWith('/*', j)) {
                j++;
            }
            const next = body[j] === ';' ? j + 1 : j;
            const text = body.slice(i, next).trimEnd();
            rv.push({ start: base + i, end: base + i + text.length, text, off: false });
            i = next;
        }
    }
    return rv;
}

/** Property and value of a declaration text, such as `fill:red;` */
export function splitDecl(text: string): { prop: string; value: string; } {
    const t = text.replace(/;\s*$/, '');
    const colon = t.indexOf(':');
    return colon < 0 ? { prop: t.trim(), value: '' } : { prop: t.slice(0, colon).trim(), value: t.slice(colon + 1).trim() };
}
