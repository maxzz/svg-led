import { type CSSProperties } from "react";
import { type Attrs, parseStyle } from "@/svg-core";

const cache = new WeakMap<object, Record<string, unknown>>();

const SPECIAL: Record<string, string> = {
    class: 'className',
    'xlink:href': 'xlinkHref',
    'xml:space': 'xmlSpace',
    'xml:lang': 'xmlLang',
    'xmlns:xlink': 'xmlnsXlink',
};

/**
 * SVG attributes as React props: kebab-case to camelCase (React maps them back), style text to an object.
 * `attrs` comes from a Valtio snapshot, which is immutable, so the result is cached per object.
 */
export function attrsToProps(attrs: Attrs): Record<string, unknown> {
    let rv = cache.get(attrs);
    if (rv) {
        return rv;
    }
    rv = {};
    for (const [name, value] of Object.entries(attrs)) {
        if (name === 'style') {
            rv.style = styleToObject(value);
        } else if (name === 'id' || name.startsWith('xmlns')) {
            if (name === 'id') {
                rv.id = value;
            }
        } else {
            rv[propName(name)] = value;
        }
    }
    cache.set(attrs, rv);
    return rv;
}

function propName(name: string): string {
    if (SPECIAL[name]) {
        return SPECIAL[name];
    }
    if (name.startsWith('data-') || name.startsWith('aria-') || name.includes(':')) {
        return name;
    }
    return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function styleToObject(text: string): CSSProperties {
    const rv: Record<string, string> = {};
    for (const [k, v] of Object.entries(parseStyle(text))) {
        rv[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
    }
    return rv as CSSProperties;
}
