/**
 * Minimal XML tree for the clipboard and export transforms. It needs no DOM, so the blocks run in tests as they run in the browser.
 * Attribute values and text are kept decoded; printers escape them for their target syntax.
 */

export type MarkupAttr = { name: string; value: string; };

export type MarkupElement = { kind: 'el'; name: string; attrs: MarkupAttr[]; children: MarkupNode[]; };

export type MarkupNode =
    | MarkupElement
    | { kind: 'text'; text: string; }
    | { kind: 'comment'; text: string; }
    | { kind: 'cdata'; text: string; }
    | { kind: 'raw'; text: string; };                       // <?xml ...?> and <!DOCTYPE ...>, written back as they are

/** Elements whose text is rendered as written, so printers keep it byte for byte */
export const PRESERVE_TEXT = new Set(['text', 'tspan', 'textPath', 'style', 'script', 'title', 'desc', 'pre']);

//---------------------------------------------------------------------------
// Parse

/** Parses well-formed markup; returns null when the text is not well-formed */
export function parseMarkup(source: string): MarkupNode[] | null {
    try {
        const { nodes, end } = parseNodes(source, 0, undefined);
        return end === source.length ? nodes : null;
    } catch {
        return null;
    }
}

//---------------------------------------------------------------------------

function parseNodes(s: string, pos: number, closing: string | undefined): { nodes: MarkupNode[]; end: number; } {
    const nodes: MarkupNode[] = [];

    while (pos < s.length) {
        if (s.startsWith('<!--', pos)) {
            const end = indexOrThrow(s, '-->', pos + 4);
            nodes.push({ kind: 'comment', text: s.slice(pos + 4, end) });
            pos = end + 3;
        } else if (s.startsWith('<![CDATA[', pos)) {
            const end = indexOrThrow(s, ']]>', pos + 9);
            nodes.push({ kind: 'cdata', text: s.slice(pos + 9, end) });
            pos = end + 3;
        } else if (s.startsWith('<?', pos)) {
            const end = indexOrThrow(s, '?>', pos + 2);
            nodes.push({ kind: 'raw', text: s.slice(pos, end + 2) });
            pos = end + 2;
        } else if (s.startsWith('<!', pos)) {
            const end = declarationEnd(s, pos);
            nodes.push({ kind: 'raw', text: s.slice(pos, end) });
            pos = end;
        } else if (s.startsWith('</', pos)) {
            CLOSE_RE.lastIndex = pos;
            const m = CLOSE_RE.exec(s);
            if (!m || m[1] !== closing) {
                throw new Error(`unexpected closing tag at ${pos}`);
            }
            return { nodes, end: pos + m[0].length };
        } else if (s[pos] === '<') {
            const open = parseOpenTag(s, pos);
            pos = open.end;
            if (!open.selfClosing) {
                const inner = parseNodes(s, pos, open.el.name);
                open.el.children = inner.nodes;
                pos = inner.end;
            }
            nodes.push(open.el);
        } else {
            const next = s.indexOf('<', pos);
            const end = next < 0 ? s.length : next;
            nodes.push({ kind: 'text', text: decodeEntities(s.slice(pos, end)) });
            pos = end;
        }
    }

    if (closing !== undefined) {
        throw new Error(`unclosed <${closing}>`);
    }
    return { nodes, end: pos };
}

const CLOSE_RE = /<\/([^\s>]+)\s*>/y;

//---------------------------------------------------------------------------

function parseOpenTag(s: string, pos: number): { el: MarkupElement; selfClosing: boolean; end: number; } {
    NAME_RE.lastIndex = pos + 1;
    const nameMatch = NAME_RE.exec(s);
    if (!nameMatch) {
        throw new Error(`bad tag at ${pos}`);
    }
    const el: MarkupElement = { kind: 'el', name: nameMatch[0], attrs: [], children: [] };

    let i = NAME_RE.lastIndex;
    for (; ;) {
        i = skipSpaces(s, i);
        if (i >= s.length) {
            throw new Error('unclosed start tag');
        }
        if (s[i] === '>') {
            return { el, selfClosing: false, end: i + 1 };
        }
        if (s.startsWith('/>', i)) {
            return { el, selfClosing: true, end: i + 2 };
        }
        NAME_RE.lastIndex = i;
        const attr = NAME_RE.exec(s);
        if (!attr) {
            throw new Error(`bad attribute at ${i}`);
        }
        i = skipSpaces(s, NAME_RE.lastIndex);
        if (s[i] !== '=') {
            throw new Error(`attribute without value at ${i}`);
        }
        i = skipSpaces(s, i + 1);
        const quote = s[i];
        if (quote !== '"' && quote !== "'") {
            throw new Error(`unquoted attribute at ${i}`);
        }
        const close = indexOrThrow(s, quote, i + 1);
        el.attrs.push({ name: attr[0], value: decodeEntities(s.slice(i + 1, close)) });
        i = close + 1;
    }
}

const NAME_RE = /[^\s=/>"'<]+/y;

//---------------------------------------------------------------------------

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

function indexOrThrow(s: string, what: string, from: number): number {
    const i = s.indexOf(what, from);
    if (i < 0) {
        throw new Error(`missing ${what}`);
    }
    return i;
}

function skipSpaces(s: string, i: number): number {
    while (i < s.length && /\s/.test(s[i])) i++;
    return i;
}

//---------------------------------------------------------------------------
// Entities

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodes the XML entities and character references; other named entities (from a DOCTYPE) stay as written */
export function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
        (m, ref: string) => {
            if (ref[0] === '#') {
                const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
                return Number.isFinite(code) ? String.fromCodePoint(code) : m;
            }
            return NAMED_ENTITIES[ref] ?? m;
        }
    );
}

export function escapeXmlText(text: string): string {
    return text.replace(/&(?!(#x[0-9a-f]+|#\d+|[a-z][\w.-]*);)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeXmlAttr(value: string, quote: '"' | "'"): string {
    const rv = escapeXmlText(value);
    return quote === '"' ? rv.replace(/"/g, '&quot;') : rv.replace(/'/g, '&apos;');
}

//---------------------------------------------------------------------------
// Queries and edits

/** The first element at the top level (skips the XML declaration, DOCTYPE, comments and whitespace) */
export function rootElement(nodes: readonly MarkupNode[]): MarkupElement | undefined {
    return nodes.find((n): n is MarkupElement => n.kind === 'el');
}

export function getAttr(el: MarkupElement, name: string): string | undefined {
    return el.attrs.find((a) => a.name === name)?.value;
}

/** Sets or (with undefined) removes an attribute; a new attribute goes last */
export function setAttr(el: MarkupElement, name: string, value: string | undefined): void {
    const i = el.attrs.findIndex((a) => a.name === name);
    if (value === undefined) {
        i >= 0 && el.attrs.splice(i, 1);
    } else if (i >= 0) {
        el.attrs[i] = { name, value };
    } else {
        el.attrs.push({ name, value });
    }
}

export function walkElements(nodes: readonly MarkupNode[], visit: (el: MarkupElement) => void): void {
    for (const node of nodes) {
        if (node.kind === 'el') {
            visit(node);
            walkElements(node.children, visit);
        }
    }
}

//---------------------------------------------------------------------------
// Print as SVG

export type PrintSvgOptions = {
    indent?: string;            // '' writes everything on one line without whitespace between tags
    quote?: '"' | "'";
};

export function printSvgMarkup(nodes: readonly MarkupNode[], options: PrintSvgOptions = {}): string {
    const indent = options.indent ?? '    ';
    const quote = options.quote ?? '"';
    const lines: string[] = [];

    for (const node of nodes) {
        printNode(node, 0);
    }

    return indent ? lines.join('\n') + '\n' : lines.join('');

    function printNode(node: MarkupNode, depth: number): void {
        const pad = indent.repeat(depth);
        switch (node.kind) {
            case 'raw': lines.push(pad + node.text); return;
            case 'comment': lines.push(`${pad}<!--${node.text}-->`); return;
            case 'cdata': lines.push(`${pad}<![CDATA[${node.text}]]>`); return;
            case 'text': {
                const t = node.text.trim();
                t && lines.push(pad + escapeXmlText(t));
                return;
            }
        }

        const open = `<${node.name}${node.attrs.map((a) => ` ${a.name}=${quote}${escapeXmlAttr(a.value, quote)}${quote}`).join('')}`;
        const kids = node.children.filter((c) => c.kind !== 'text' || c.text.trim() !== '');
        if (!kids.length) {
            lines.push(`${pad}${open}/>`);
        } else if (PRESERVE_TEXT.has(node.name) || kids.every((c) => c.kind === 'text' || c.kind === 'cdata')) {
            lines.push(`${pad}${open}>${node.children.map(inlineText).join('')}</${node.name}>`);
        } else {
            lines.push(`${pad}${open}>`);
            for (const kid of kids) {
                printNode(kid, depth + 1);
            }
            lines.push(`${pad}</${node.name}>`);
        }
    }

    function inlineText(node: MarkupNode): string {
        switch (node.kind) {
            case 'text': return escapeXmlText(node.text);
            case 'cdata': return `<![CDATA[${node.text}]]>`;
            case 'comment': return `<!--${node.text}-->`;
            case 'raw': return node.text;
            case 'el': return printSvgMarkup([node], { indent: '', quote });
        }
    }
}
