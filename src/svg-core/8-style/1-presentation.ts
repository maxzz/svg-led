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

/**
 * How a shape should take part in hit testing.
 *
 * A fill of `#0000` is black with alpha 0. Chrome still hits that shape (SVG hit testing ignores alpha),
 * so a click lands on an invisible path drawn over a group and the group is never selected. An older
 * browser does not hit the same fill, which is why the group is selected there. `none` lets the click
 * pass through; `visibleStroke` keeps a stroke-only shape selectable along its stroke.
 * Undefined leaves the browser default. A class or an explicit pointer-events value is left alone,
 * because a stylesheet can paint the shape.
 */
export function inertPointerEvents(attrs: Attrs): 'none' | 'visibleStroke' | undefined {
    if (getPresentation(attrs, 'pointer-events') || attrs.class) {
        return undefined;
    }
    const opacity = opacityFactor(getPresentation(attrs, 'opacity'));
    if (opacity <= 0) {
        return 'none';
    }
    const fill = paintVisible(getPresentation(attrs, 'fill'), true) && opacityFactor(getPresentation(attrs, 'fill-opacity')) * opacity > 0;
    const strokeWidth = getPresentation(attrs, 'stroke-width');
    const width = strokeWidth === undefined ? 1 : Number.parseFloat(strokeWidth);
    const stroke = paintVisible(getPresentation(attrs, 'stroke'), false) && width > 0 && opacityFactor(getPresentation(attrs, 'stroke-opacity')) * opacity > 0;
    if (!fill && !stroke) {
        return 'none';
    }
    if (!fill) {
        return 'visibleStroke';
    }
    return undefined;
}

/** True when the fill can be clicked. An omitted fill is the default black. A class with no fill attribute may still paint one. */
export function fillIsHittable(attrs: Attrs): boolean {
    if (attrs.class && getPresentation(attrs, 'fill') === undefined) {
        return true;
    }
    const opacity = opacityFactor(getPresentation(attrs, 'opacity'));
    return paintVisible(getPresentation(attrs, 'fill'), true) && opacityFactor(getPresentation(attrs, 'fill-opacity')) * opacity > 0;
}

function opacityFactor(value: string | undefined): number {
    if (value === undefined) {
        return 1;
    }
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : 1;
}

/** `omittedIsPaint` is true for fill (defaults to black) and false for stroke (defaults to none). Unknown colors count as paint. */
function paintVisible(color: string | undefined, omittedIsPaint: boolean): boolean {
    if (color === undefined) {
        return omittedIsPaint;
    }
    const alpha = colorAlpha(color);
    return alpha === null || alpha > 0;
}

function colorAlpha(color: string): number | null {
    const c = color.trim().toLowerCase();
    if (c === 'none' || c === 'transparent') {
        return 0;
    }
    const hex = /^#([0-9a-f]{3,8})$/.exec(c);
    if (hex) {
        const h = hex[1];
        if (h.length === 4) {
            return Number.parseInt(h[3] + h[3], 16) / 255;
        }
        if (h.length === 8) {
            return Number.parseInt(h.slice(6, 8), 16) / 255;
        }
        if (h.length === 3 || h.length === 6) {
            return 1;
        }
        return null;
    }
    const slash = /\/\s*([\d.]+%?)\s*\)/.exec(c);
    if (slash) {
        return parseAlpha(slash[1]);
    }
    const commas = /^rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*([\d.]+%?)\s*\)$/.exec(c);
    if (commas) {
        return parseAlpha(commas[1]);
    }
    if (c.startsWith('rgb')) {
        return 1;
    }
    return null;
}

function parseAlpha(text: string): number {
    return text.endsWith('%') ? Number.parseFloat(text) / 100 : Number.parseFloat(text);
}

//---------------------------------------------------------------------------
