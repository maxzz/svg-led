//---------------------------------------------------------------------------

/** `fill: red; stroke-width: 2` as the JSX style object source `{ fill: "red", strokeWidth: 2 }` */
export function cssToStyleObject(css: string): string {
    const entries: string[] = [];
    for (const part of css.split(';')) {
        const i = part.indexOf(':');
        if (i <= 0) {
            continue;
        }
        const prop = part.slice(0, i).trim();
        const value = part.slice(i + 1).trim();
        if (!prop) {
            continue;
        }
        const key = cssPropToCamel(prop);
        const keyText = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
        const valueText = isPlainNumber(value) && UNITLESS.has(prop) ? value : JSON.stringify(value);
        entries.push(`${keyText}: ${valueText}`);
    }
    return entries.length ? `{ ${entries.join(', ')} }` : '{}';
}

/**
 * The CSS text of a JSX style object literal such as `{ fill: "red", strokeWidth: 2 }`.
 * Entries whose value is not a literal (variables, expressions) are left out.
 */
export function styleObjectToCss(source: string): string {
    const body = source.trim().replace(/^\{/, '').replace(/\}$/, '');
    const decls: string[] = [];
    for (const entry of splitTopLevel(body, ',')) {
        const i = topLevelColon(entry);
        if (i <= 0) {
            continue;
        }
        const key = unquote(entry.slice(0, i).trim()) ?? entry.slice(0, i).trim();
        const raw = entry.slice(i + 1).trim();
        const prop = camelToCssProp(key);
        let value = unquote(raw);
        if (value === undefined && isPlainNumber(raw)) {
            value = UNITLESS.has(prop) || Number(raw) === 0 ? raw : `${raw}px`;
        }
        if (value !== undefined && /^[\w-]+$/.test(key)) {
            decls.push(`${prop}:${value}`);
        }
    }
    return decls.join(';');
}

/** CSS properties that React writes without `px` when given a number */
const UNITLESS = new Set([
    'opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'flood-opacity', 'stroke-width', 'stroke-miterlimit', 'stroke-dashoffset',
    'z-index', 'line-height', 'font-weight', 'flex', 'flex-grow', 'flex-shrink', 'order', 'zoom', 'scale',
]);

export function cssPropToCamel(prop: string): string {
    if (prop.startsWith('--')) {
        return prop;
    }
    return prop.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function camelToCssProp(key: string): string {
    if (key.startsWith('--')) {
        return key;
    }
    return key.replace(/^(Webkit|Moz|O)(?=[A-Z])/, (m) => '-' + m.toLowerCase()).replace(/^ms(?=[A-Z])/, '-ms').replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

//---------------------------------------------------------------------------

export function isPlainNumber(text: string): boolean {
    return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(text.trim());
}

/** The value of a JS string literal ('...', "..." or a template without substitutions); undefined for anything else */
export function unquote(text: string): string | undefined {
    const t = text.trim();
    const q = t[0];
    if (t.length < 2 || (q !== '"' && q !== "'" && q !== '`') || t[t.length - 1] !== q) {
        return undefined;
    }
    const inner = t.slice(1, -1);
    if (q === '`' && inner.includes('${')) {
        return undefined;
    }
    return inner.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, e: string) => {
        switch (e[0]) {
            case 'n': return '\n';
            case 't': return '\t';
            case 'r': return '\r';
            case 'u': return String.fromCodePoint(parseInt(e[1] === '{' ? e.slice(2, -1) : e.slice(1), 16));
            case 'x': return String.fromCharCode(parseInt(e.slice(1), 16));
            default: return e;
        }
    });
}

function splitTopLevel(text: string, sep: string): string[] {
    const rv: string[] = [];
    let depth = 0;
    let quote: string | null = null;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = null;
        } else if (c === '"' || c === "'" || c === '`') {
            quote = c;
        } else if (c === '(' || c === '[' || c === '{') {
            depth++;
        } else if (c === ')' || c === ']' || c === '}') {
            depth--;
        } else if (c === sep && depth === 0) {
            rv.push(text.slice(start, i));
            start = i + 1;
        }
    }
    rv.push(text.slice(start));
    return rv.filter((s) => s.trim());
}

function topLevelColon(entry: string): number {
    let quote: string | null = null;
    for (let i = 0; i < entry.length; i++) {
        const c = entry[i];
        if (quote) {
            if (c === '\\') i++;
            else if (c === quote) quote = null;
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === ':') {
            return i;
        }
    }
    return -1;
}
