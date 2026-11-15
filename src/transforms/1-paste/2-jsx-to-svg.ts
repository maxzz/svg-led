import { escapeXmlAttr, escapeXmlText } from "../0-markup/1-markup-tree";
import { knownSvgElementName, svgAttrName, svgElementName } from "../0-markup/2-svg-names";
import { isPlainNumber, styleObjectToCss, unquote } from "../0-markup/3-style-object";
import { type PasteBlock } from "./9-paste-types";

/**
 * React (or react-native-svg) JSX to SVG markup: camelCase props become SVG attributes, `{1.5}` becomes "1.5",
 * a style object becomes CSS text, and className becomes class. Spreads, event handlers, dynamic values and
 * conditional children such as `{title && <title>{title}</title>}` are dropped.
 */
export const jsxToSvgBlock: PasteBlock = {
    id: 'jsx-to-svg',
    label: 'React JSX to SVG',
    notice: 'Converted the React component to SVG',
    apply: (data) => {
        if (!looksLikeJsx(data.text)) {
            return undefined;
        }
        const svg = jsxToSvg(data.text);
        return svg ? { ...data, text: svg } : undefined;
    },
};

const JSX_MARKERS: readonly RegExp[] = [
    /=\s*\{/,                                       // prop={value}
    /\{\s*\.\.\./,                                  // {...rest}
    /\{\s*\/\*/,                                    // {/* comment */}
    />\s*\{/,                                       // {expression} child
    /\sclassName\s*=/,
    /\s(stroke|fill|clip|font|text|stop|flood|lighting|marker|dominant|alignment|baseline|enable|glyph|image|letter|paint|pointer|shape|vector|word|writing|color|xlink|xml)[A-Z]\w*\s*=/,
    /<\/?(Svg|G|Path|Rect|Circle|Ellipse|Line|Polyline|Polygon|Defs|Use|Symbol|LinearGradient|RadialGradient|Stop|ClipPath|Mask|Text|TSpan)[\s>/]/,
    /<\/?>/,                                        // fragment
    /<[a-z]+\.[a-z]+[\s>/]/i,                       // <motion.path>
];

export function looksLikeJsx(text: string): boolean {
    return JSX_MARKERS.some((re) => re.test(text));
}

/** SVG markup for JSX source; undefined when the JSX is not balanced */
export function jsxToSvg(source: string): string | undefined {
    try {
        const out: string[] = [];
        parseChildren(source, 0, undefined, out);
        return addNamespaces(out.join('').trim());
    } catch {
        return undefined;
    }
}

function addNamespaces(svg: string): string {
    if (!/^<svg[\s>/]/.test(svg)) {
        return svg;
    }
    const open = /^<svg[^>]*>/.exec(svg)?.[0] ?? '';
    let extra = '';
    if (!/\sxmlns=/.test(open)) {
        extra += ' xmlns="http://www.w3.org/2000/svg"';
    }
    if (svg.includes('xlink:') && !/\sxmlns:xlink=/.test(open)) {
        extra += ' xmlns:xlink="http://www.w3.org/1999/xlink"';
    }
    return extra ? `<svg${extra}${svg.slice(4)}` : svg;
}

//---------------------------------------------------------------------------

const CLOSE_RE = /<\/\s*([\w.:$-]*)\s*>/y;
const TAG_RE = /<\s*([A-Za-z_$][\w.:$-]*)?/y;
const ATTR_NAME_RE = /[^\s=/>{]+/y;

/** Writes the SVG for the children up to the closing tag `closing` (or to the end of the text); returns the index after it */
function parseChildren(s: string, i: number, closing: string | undefined, out: string[]): number {
    while (i < s.length) {
        if (s.startsWith('<!--', i)) {
            i = indexAfter(s, '-->', i);
        } else if (s.startsWith('</', i)) {
            CLOSE_RE.lastIndex = i;
            const m = CLOSE_RE.exec(s);
            if (!m || closing === undefined || m[1] !== closing) {
                throw new Error(`unexpected closing tag at ${i}`);
            }
            return i + m[0].length;
        } else if (s[i] === '<') {
            i = parseElement(s, i, out);
        } else if (s[i] === '{') {
            i = skipBraces(s, i); // children expressions are dynamic content
        } else {
            let j = i;
            while (j < s.length && s[j] !== '<' && s[j] !== '{') {
                j++;
            }
            const text = s.slice(i, j);
            out.push(/^\s*$/.test(text) && text.includes('\n') ? '' : escapeXmlText(text));
            i = j;
        }
    }
    if (closing !== undefined) {
        throw new Error(`unclosed <${closing}>`);
    }
    return i;
}

function parseElement(s: string, i: number, out: string[]): number {
    TAG_RE.lastIndex = i;
    const m = TAG_RE.exec(s)!;
    const tag = m[1] ?? '';
    let j = TAG_RE.lastIndex;
    const attrs: string[] = [];
    let selfClosing = false;

    for (;;) {
        j = skipSpaces(s, j);
        if (j >= s.length) {
            throw new Error('unclosed tag');
        }
        if (s.startsWith('/>', j)) {
            selfClosing = true;
            j += 2;
            break;
        }
        if (s[j] === '>') {
            j++;
            break;
        }
        if (s[j] === '{') {
            j = skipBraces(s, j); // {...rest} or {/* comment */}
            continue;
        }
        ATTR_NAME_RE.lastIndex = j;
        const nameMatch = ATTR_NAME_RE.exec(s);
        if (!nameMatch) {
            throw new Error(`bad attribute at ${j}`);
        }
        const prop = nameMatch[0];
        j = skipSpaces(s, ATTR_NAME_RE.lastIndex);
        let value: string | undefined;
        if (s[j] === '=') {
            j = skipSpaces(s, j + 1);
            if (s[j] === '"' || s[j] === "'") {
                const end = s.indexOf(s[j], j + 1);
                if (end < 0) {
                    throw new Error('unclosed attribute value');
                }
                value = s.slice(j + 1, end);
                j = end + 1;
            } else if (s[j] === '{') {
                const end = skipBraces(s, j);
                value = literalValue(prop, s.slice(j + 1, end - 1));
                j = end;
            } else {
                throw new Error(`bad attribute value at ${j}`);
            }
        }
        const name = svgAttrName(prop);
        if (name && value !== undefined) {
            attrs.push(` ${name}="${escapeXmlAttr(value, '"')}"`);
        }
    }

    const name = elementName(tag);
    if (!name) {
        return selfClosing ? j : parseChildren(s, j, tag, out); // fragments and other components: keep the children only
    }
    out.push(`<${name}${attrs.join('')}`);
    if (selfClosing) {
        out.push('/>');
        return j;
    }
    out.push('>');
    j = parseChildren(s, j, tag, out);
    out.push(`</${name}>`);
    return j;
}

/** `motion.path` and `animated.Path` render the SVG element after the dot */
function elementName(tag: string): string | undefined {
    if (!tag) {
        return undefined;
    }
    const dot = tag.lastIndexOf('.');
    return dot < 0 ? svgElementName(tag) : knownSvgElementName(tag.slice(dot + 1));
}

/** The attribute text for a `{...}` value when it is a literal; undefined for values only known at run time */
function literalValue(prop: string, expr: string): string | undefined {
    const t = expr.trim();
    if (prop === 'style' && t.startsWith('{')) {
        return styleObjectToCss(t) || undefined;
    }
    if (isPlainNumber(t)) {
        return t;
    }
    if (t === 'true' || t === 'false') {
        return t;
    }
    return unquote(t);
}

//---------------------------------------------------------------------------

/** Index after the `}` that closes the `{` at `i`. Strings, comments and JSX inside are skipped as a whole. */
function skipBraces(s: string, i: number): number {
    let depth = 0;
    for (; i < s.length; i++) {
        const c = s[i];
        if (c === '"' || c === "'" || c === '`') {
            i = skipString(s, i);
        } else if (s.startsWith('/*', i)) {
            i = indexAfter(s, '*/', i + 2) - 1;
        } else if (s.startsWith('//', i)) {
            const e = s.indexOf('\n', i);
            i = e < 0 ? s.length : e;
        } else if (c === '<' && startsJsx(s, i)) {
            i = parseElement(s, i, []) - 1;
        } else if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
            if (depth === 0) {
                return i + 1;
            }
        }
    }
    throw new Error('unbalanced braces');
}

/** A `<` inside an expression starts JSX after an operator or an opening bracket, and not after a value (`a < b`) */
function startsJsx(s: string, i: number): boolean {
    if (!/[A-Za-z>]/.test(s[i + 1] ?? '')) {
        return false;
    }
    let k = i - 1;
    while (k >= 0 && /\s/.test(s[k])) {
        k--;
    }
    return k < 0 || /[(,=?:&|{[>]/.test(s[k]) || /\breturn$/.test(s.slice(Math.max(0, k - 5), k + 1));
}

/** Index of the closing quote of the string literal at `i` */
function skipString(s: string, i: number): number {
    const q = s[i];
    for (let j = i + 1; j < s.length; j++) {
        if (s[j] === '\\') {
            j++;
        } else if (q === '`' && s.startsWith('${', j)) {
            j = skipBraces(s, j + 1) - 1;
        } else if (s[j] === q) {
            return j;
        }
    }
    throw new Error('unclosed string');
}

function indexAfter(s: string, what: string, from: number): number {
    const e = s.indexOf(what, from);
    if (e < 0) {
        throw new Error(`missing ${what}`);
    }
    return e + what.length;
}

function skipSpaces(s: string, i: number): number {
    while (i < s.length && /\s/.test(s[i])) {
        i++;
    }
    return i;
}
