/**
 * Pretty-prints SVG source text: one tag per line, indented by nesting depth.
 * Attribute values, comments, CDATA and processing instructions are kept as they are.
 * Whitespace-sensitive elements (text, tspan, style, ...) keep their content byte for byte.
 * Returns null when the text is not well-formed enough to format (the caller keeps the text unchanged).
 */

const INDENT = '  ';

/** Elements whose inner text is rendered as written, so their content must not be re-indented */
const PRESERVE_CONTENT = new Set(['text', 'tspan', 'textPath', 'style', 'script', 'foreignObject', 'pre', 'textarea']);

type RawNode = { kind: 'raw'; text: string; };
type TextNode = { kind: 'text'; text: string; };
type ElementNode = {
    kind: 'el';
    name: string;
    attrs: string[];       // each as name="value" with the original quotes
    selfClosing: boolean;
    preserve: boolean;     // children is a single raw node with the untouched inner markup
    children: MarkupNode[];
};
type MarkupNode = RawNode | TextNode | ElementNode;

export function formatSvgText(source: string): string | null {
    try {
        const { nodes, end } = parseNodes(source, 0, undefined);
        if (end !== source.length) {
            return null;
        }
        const lines: string[] = [];
        for (const node of nodes) {
            printNode(node, 0, lines);
        }
        const out = lines.join('\n');
        return source.endsWith('\n') && out.length ? out + '\n' : out;
    } catch {
        return null;
    }
}

//---------------------------------------------------------------------------

const NAME_RE = /[^\s=/>"'<]+/y;
const CLOSE_RE = /<\/([^\s>]+)\s*>/y;

type ParseResult = { nodes: MarkupNode[]; end: number; closeStart: number; };

/** Parses siblings from `pos` until the closing tag of `closing` (or the end of the text when undefined) */
function parseNodes(s: string, pos: number, closing: string | undefined): ParseResult {
    const nodes: MarkupNode[] = [];

    while (pos < s.length) {
        if (s.startsWith('<!--', pos)) {
            const end = s.indexOf('-->', pos + 4);
            if (end < 0) throw new Error('unclosed comment');
            nodes.push({ kind: 'raw', text: s.slice(pos, end + 3) });
            pos = end + 3;
        } else if (s.startsWith('<![CDATA[', pos)) {
            const end = s.indexOf(']]>', pos);
            if (end < 0) throw new Error('unclosed CDATA');
            nodes.push({ kind: 'raw', text: s.slice(pos, end + 3) });
            pos = end + 3;
        } else if (s.startsWith('<?', pos)) {
            const end = s.indexOf('?>', pos + 2);
            if (end < 0) throw new Error('unclosed processing instruction');
            nodes.push({ kind: 'raw', text: s.slice(pos, end + 2) });
            pos = end + 2;
        } else if (s.startsWith('<!', pos)) {
            const end = declarationEnd(s, pos);
            nodes.push({ kind: 'raw', text: s.slice(pos, end) });
            pos = end;
        } else if (s.startsWith('</', pos)) {
            CLOSE_RE.lastIndex = pos;
            const m = CLOSE_RE.exec(s);
            if (!m || m[1] !== closing) throw new Error(`unexpected closing tag at ${pos}`);
            return { nodes, end: pos + m[0].length, closeStart: pos };
        } else if (s[pos] === '<') {
            const el = parseOpenTag(s, pos);
            pos = el.end;
            if (el.selfClosing) {
                nodes.push(el.node);
                continue;
            }
            const inner = parseNodes(s, pos, el.node.name);
            if (PRESERVE_CONTENT.has(el.node.name)) {
                el.node.preserve = true;
                el.node.children = [{ kind: 'raw', text: s.slice(pos, inner.closeStart) }];
            } else {
                el.node.children = inner.nodes;
            }
            nodes.push(el.node);
            pos = inner.end;
        } else {
            const next = s.indexOf('<', pos);
            const end = next < 0 ? s.length : next;
            nodes.push({ kind: 'text', text: s.slice(pos, end) });
            pos = end;
        }
    }

    if (closing !== undefined) throw new Error(`unclosed <${closing}>`);
    return { nodes, end: pos, closeStart: pos };
}

/** End of a <!DOCTYPE ...> style declaration, skipping an internal subset in [...] */
function declarationEnd(s: string, pos: number): number {
    let depth = 0;
    for (let i = pos + 2; i < s.length; i++) {
        const c = s[i];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '>' && depth <= 0) return i + 1;
    }
    throw new Error('unclosed declaration');
}

function parseOpenTag(s: string, pos: number): { node: ElementNode; selfClosing: boolean; end: number; } {
    NAME_RE.lastIndex = pos + 1;
    const nameMatch = NAME_RE.exec(s);
    if (!nameMatch) throw new Error(`bad tag at ${pos}`);
    const node: ElementNode = { kind: 'el', name: nameMatch[0], attrs: [], selfClosing: false, preserve: false, children: [] };

    let i = NAME_RE.lastIndex;
    for (;;) {
        i = skipSpaces(s, i);
        if (i >= s.length) throw new Error('unclosed start tag');
        if (s[i] === '>') return { node, selfClosing: false, end: i + 1 };
        if (s.startsWith('/>', i)) {
            node.selfClosing = true;
            return { node, selfClosing: true, end: i + 2 };
        }
        NAME_RE.lastIndex = i;
        const attr = NAME_RE.exec(s);
        if (!attr) throw new Error(`bad attribute at ${i}`);
        i = skipSpaces(s, NAME_RE.lastIndex);
        if (s[i] !== '=') throw new Error(`attribute without value at ${i}`);
        i = skipSpaces(s, i + 1);
        const quote = s[i];
        if (quote !== '"' && quote !== "'") throw new Error(`unquoted attribute at ${i}`);
        const close = s.indexOf(quote, i + 1);
        if (close < 0) throw new Error('unclosed attribute value');
        node.attrs.push(`${attr[0]}=${s.slice(i, close + 1)}`);
        i = close + 1;
    }
}

function skipSpaces(s: string, i: number): number {
    while (i < s.length && /\s/.test(s[i])) i++;
    return i;
}

//---------------------------------------------------------------------------

function openTag(el: ElementNode): string {
    return `<${el.name}${el.attrs.map((a) => ' ' + a).join('')}`;
}

function printNode(node: MarkupNode, depth: number, lines: string[]): void {
    const pad = INDENT.repeat(depth);

    if (node.kind === 'raw') {
        lines.push(pad + node.text);
        return;
    }
    if (node.kind === 'text') {
        const t = node.text.trim();
        if (t) lines.push(pad + t);
        return;
    }

    const open = openTag(node);
    if (node.selfClosing) {
        lines.push(pad + open + '/>');
        return;
    }
    if (node.preserve) {
        lines.push(pad + open + '>' + node.children.map((c) => (c as RawNode).text).join('') + `</${node.name}>`);
        return;
    }

    const kids = node.children.filter((c) => c.kind !== 'text' || c.text.trim() !== '');
    if (kids.length === 0) {
        lines.push(pad + open + `></${node.name}>`);
    } else if (kids.length === 1 && kids[0].kind === 'text') {
        lines.push(pad + open + '>' + kids[0].text.trim() + `</${node.name}>`);
    } else {
        lines.push(pad + open + '>');
        for (const kid of kids) {
            printNode(kid, depth + 1, lines);
        }
        lines.push(pad + `</${node.name}>`);
    }
}
