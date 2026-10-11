import { type Attrs } from "../1-model/1-types";

//---------------------------------------------------------------------------

/**
 * Presentation properties can be written as attributes or inside the style attribute;
 * style wins in SVG, so reading checks style first and writing removes the style entry.
 */
export function getPresentation(attrs: Attrs, prop: string): string | undefined {
    const fromStyle = parseStyle(attrs.style ?? '')[prop];
    return fromStyle ?? attrs[prop];
}

/** Writes the property as an attribute; `undefined` removes it */
export function setPresentation(attrs: Attrs, prop: string, value: string | undefined): void {
    if (attrs.style) {
        const style = parseStyle(attrs.style);
        if (prop in style) {
            delete style[prop];
            const text = stringifyStyle(style);
            if (text) {
                attrs.style = text;
            } else {
                delete attrs.style;
            }
        }
    }
    if (value === undefined) {
        delete attrs[prop];
    } else {
        attrs[prop] = value;
    }
}

//---------------------------------------------------------------------------

export function parseStyle(text: string): Record<string, string> {
    const rv: Record<string, string> = {};
    for (const part of text.split(';')) {
        const i = part.indexOf(':');
        if (i > 0) {
            const k = part.slice(0, i).trim();
            const v = part.slice(i + 1).trim();
            if (k) {
                rv[k] = v;
            }
        }
    }
    return rv;
}

export function stringifyStyle(style: Record<string, string>): string {
    return Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';');
}

//---------------------------------------------------------------------------
